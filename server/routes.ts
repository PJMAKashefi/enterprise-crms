import { Router, Request, Response } from 'express';
import {
  getDb,
  saveDatabase,
  generateCorrespondenceNumber,
  generateTechnicalDocumentNumber,
  recordAuditLog,
  wipeDatabaseToClean,
  deleteCorrespondenceFromDb,
  recalculateSequence,
  clearAllTechnicalDocuments,
} from './db';
import {
  Correspondence,
  Task,
  AuditLog,
  CorrespondenceVersion,
  Contact,
  User,
  ArchiveFolder,
  TechnicalDocument,
  DocumentRevision,
  EmailTemplateItem,
  ExternalUser,
  DocumentShare,
  DocumentComment,
  ExternalAccessAuditLog,
  ExtensionRequest,
  CommentReply,
  ExternalAuditEventType,
  ExternalAccessSession,
} from '../src/types';
import { evaluateAccessSchedule } from './accessControl';
import crypto from 'crypto';
import {
  improveLetterText,
  draftOfficialResponse,
  extractIncomingMetadata,
} from './gemini';
import {
  generateClientCode,
  generateDefaultCostCode,
  generateDefaultRevenueCode,
} from '../src/utils/clientCodeGenerator';

export const apiRouter = Router();

// Current active authenticated user id in memory (default to Admin Ali Kashefi)
let currentUserId = 'usr-admin-1';

function getCurrentUser(): User {
  const db = getDb();
  let user = db.users.find((u) => u.id === currentUserId);
  if (!user) {
    user = db.users.find((u) => u.role === 'admin') || db.users[0];
    if (user) {
      currentUserId = user.id;
    }
  }
  return user;
}

// -------------------------------------------------------------
// AUTHENTICATION & SESSION
// -------------------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  const db = getDb();
  const cleanId = String(identifier).trim().toLowerCase();
  const cleanPass = String(password).trim();

  // Find user by email or username
  const user = db.users.find((u) => {
    const emailMatch = u.email && u.email.toLowerCase() === cleanId;
    const usernameMatch = u.username && u.username.toLowerCase() === cleanId;
    return emailMatch || usernameMatch;
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found. Please check your username or email.' });
  }

  if (user.active === false) {
    return res.status(403).json({ error: 'Account is deactivated. Please contact the administrator.' });
  }

  // Password verification: support configured password or fallback to initial master password
  const expectedPassword = user.password || 'Pjmak2026!';
  if (cleanPass !== expectedPassword) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  // Ensure password is saved on user if it was using default
  if (!user.password) {
    user.password = expectedPassword;
  }

  currentUserId = user.id;
  user.lastLogin = new Date().toISOString();
  saveDatabase();

  recordAuditLog({
    action: 'USER_LOGIN',
    newValue: `User ${user.name} (${user.email}) successfully logged in`,
    performedByUserId: user.id,
    performedByUserName: user.name,
    reason: 'Standard interactive authentication',
  });

  // Return user without exposing raw password unnecessarily
  const safeUser = { ...user };
  delete safeUser.password;

  res.json({
    success: true,
    user: safeUser,
    message: `Welcome back, ${user.name}!`,
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const currentUser = getCurrentUser();
  if (currentUser) {
    recordAuditLog({
      action: 'USER_LOGOUT',
      newValue: `User ${currentUser.name} signed out`,
      performedByUserId: currentUser.id,
      performedByUserName: currentUser.name,
    });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const safeUser = { ...currentUser };
  delete safeUser.password;
  res.json({ currentUser: safeUser });
});

apiRouter.get('/session', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  // Provide users with safe fields for general views, with admin able to see credentials in admin view
  const safeUsers = db.users.map((u) => {
    const copy = { ...u };
    if (currentUser.role !== 'admin') {
      delete copy.password;
    }
    return copy;
  });

  res.json({
    currentUser,
    users: safeUsers,
    departments: db.departments,
  });
});

apiRouter.post('/session/switch', (req: Request, res: Response) => {
  const { userId } = req.body;
  const db = getDb();
  const found = db.users.find((u) => u.id === userId);
  if (!found) {
    return res.status(404).json({ error: 'User not found' });
  }
  currentUserId = userId;
  res.json({ success: true, currentUser: found });
});

// -------------------------------------------------------------
// USER MANAGEMENT (ADMINISTRATOR ACCESS)
// -------------------------------------------------------------
apiRouter.post('/users', (req: Request, res: Response) => {
  const currentUser = getCurrentUser();
  if (currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Permission Denied: Only administrators can create new users.' });
  }

  const { name, email, username, password, role, departmentId, departmentName, title, active } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, Email, and Password are required.' });
  }

  const db = getDb();
  const existing = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() ||
           (username && u.username && u.username.toLowerCase() === username.trim().toLowerCase())
  );

  if (existing) {
    return res.status(400).json({ error: 'A user with this email or username already exists.' });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    username: (username || email.split('@')[0]).trim().toLowerCase(),
    password: password.trim(),
    role: role || 'officer',
    departmentId: departmentId || 'dept-1',
    departmentName: departmentName || 'General Administration',
    title: title?.trim() || 'Officer',
    active: active !== false,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase();

  recordAuditLog({
    action: 'USER_CREATED',
    newValue: `Created new user ${newUser.name} (${newUser.email}) with role: ${newUser.role}`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: 'Administrative user provisioning',
  });

  res.json({ success: true, user: newUser });
});

apiRouter.put('/users/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser();
  const targetId = req.params.id;
  const db = getDb();
  const targetUser = db.users.find((u) => u.id === targetId);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isSelf = currentUser.id === targetId;
  const isAdmin = currentUser.role === 'admin';

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'Permission Denied: You cannot modify this user.' });
  }

  const { name, email, username, password, role, departmentId, departmentName, title, active } = req.body;

  if (name) targetUser.name = name.trim();
  if (email) targetUser.email = email.trim().toLowerCase();
  if (username) targetUser.username = username.trim().toLowerCase();
  if (password && password.trim().length > 0) {
    targetUser.password = password.trim();
  }

  // Only admin can change roles and active status
  if (isAdmin) {
    if (role) targetUser.role = role;
    if (departmentId) targetUser.departmentId = departmentId;
    if (departmentName) targetUser.departmentName = departmentName;
    if (title) targetUser.title = title.trim();
    if (active !== undefined) {
      // Prevent admin from deactivating themselves
      if (isSelf && active === false) {
        return res.status(400).json({ error: 'You cannot deactivate your own administrator account.' });
      }
      targetUser.active = Boolean(active);
    }
  }

  saveDatabase();

  recordAuditLog({
    action: 'USER_UPDATED',
    newValue: `Updated account ${targetUser.name} (${targetUser.email})`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: password ? 'User profile and credentials updated' : 'User profile updated',
  });

  res.json({ success: true, user: targetUser });
});

apiRouter.delete('/users/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser();
  const targetId = req.params.id;

  if (currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Permission Denied: Only administrators can delete users.' });
  }

  if (currentUser.id === targetId) {
    return res.status(400).json({ error: 'You cannot delete your own logged-in administrator account.' });
  }

  const db = getDb();
  const userIndex = db.users.findIndex((u) => u.id === targetId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const deletedUser = db.users.splice(userIndex, 1)[0];
  saveDatabase();

  recordAuditLog({
    action: 'USER_DELETED',
    newValue: `Removed user account ${deletedUser.name} (${deletedUser.email})`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: 'Administrative user de-provisioning',
  });

  res.json({ success: true, message: `User ${deletedUser.name} deleted successfully.` });
});

apiRouter.post('/admin/clean-database', (req: Request, res: Response) => {
  const currentUser = getCurrentUser();
  if (currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Permission Denied: Only administrators can reset data.' });
  }

  const cleanDb = wipeDatabaseToClean();
  res.json({
    success: true,
    message: 'Database successfully reset to a clean state with zero records.',
    correspondenceCount: cleanDb.correspondence.length,
    taskCount: cleanDb.tasks.length,
  });
});

// -------------------------------------------------------------
// CORRESPONDENCE
// -------------------------------------------------------------
apiRouter.get('/correspondence', (req: Request, res: Response) => {
  const db = getDb();
  const {
    type,
    search,
    status,
    confidentiality,
    priority,
    departmentId,
    archived,
  } = req.query;

  let list = db.correspondence;

  if (type) {
    list = list.filter((c) => c.type === type);
  }

  if (archived !== undefined) {
    const isArch = archived === 'true';
    list = list.filter((c) => !!c.isArchived === isArch);
  }

  if (status) {
    list = list.filter((c) => c.status === status);
  }

  if (confidentiality) {
    list = list.filter((c) => c.confidentiality === confidentiality);
  }

  if (priority) {
    list = list.filter((c) => c.priority === priority);
  }

  if (departmentId) {
    list = list.filter((c) => c.assignedDepartmentId === departmentId);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    list = list.filter((c) => {
      return (
        c.correspondenceNumber.toLowerCase().includes(q) ||
        (c.externalRefNumber && c.externalRefNumber.toLowerCase().includes(q)) ||
        c.subject.toLowerCase().includes(q) ||
        c.senderOrg.toLowerCase().includes(q) ||
        c.senderPerson.toLowerCase().includes(q) ||
        c.recipientOrg.toLowerCase().includes(q) ||
        c.recipientPerson.toLowerCase().includes(q) ||
        c.bodyHtml.toLowerCase().includes(q)
      );
    });
  }

  // Sort latest first
  list.sort(
    (a, b) =>
      new Date(b.createdDateTime).getTime() -
      new Date(a.createdDateTime).getTime()
  );

  res.json(list);
});

apiRouter.get('/correspondence/:id', (req: Request, res: Response) => {
  const db = getDb();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  // Return item along with linked tasks and audit logs
  const tasks = db.tasks.filter((t) => t.correspondenceId === item.id);
  const auditLogs = db.auditLogs.filter(
    (a) => a.correspondenceId === item.id
  );

  res.json({
    correspondence: item,
    tasks,
    auditLogs,
  });
});

// Create new correspondence (automatic numbering & official date)
apiRouter.post('/correspondence', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const body = req.body;

  if (!body.type || !body.subject) {
    return res
      .status(400)
      .json({ error: 'Type and Subject are mandatory fields.' });
  }

  // Generate sequence-safe number
  const deptCode = body.assignedDepartmentId
    ? db.departments.find((d) => d.id === body.assignedDepartmentId)?.code
    : undefined;

  const { number, sequence } = generateCorrespondenceNumber(
    body.type,
    deptCode
  );

  const now = new Date();
  const officialDate = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

  const isOutgoing = body.type === 'outgoing';
  const isInternal = body.type === 'internal';

  // Automatically trace clientCode from counterpart organization if present in contacts
  const counterpartyOrg = isOutgoing ? body.recipientOrg : body.senderOrg;
  let resolvedClientCode = body.clientCode;
  let resolvedCostCode = body.costCode;
  let resolvedRevenueCode = body.revenueCode;

  if (counterpartyOrg && !isInternal) {
    const matchedContact = db.contacts.find(
      (c) => c.orgName && c.orgName.toLowerCase() === counterpartyOrg.trim().toLowerCase()
    );
    if (matchedContact) {
      if (!resolvedClientCode && matchedContact.contactCode) {
        resolvedClientCode = matchedContact.contactCode;
      }
      if (!resolvedCostCode && matchedContact.defaultCostCode) {
        resolvedCostCode = matchedContact.defaultCostCode;
      }
      if (!resolvedRevenueCode && matchedContact.defaultRevenueCode) {
        resolvedRevenueCode = matchedContact.defaultRevenueCode;
      }
    } else if (!resolvedClientCode && counterpartyOrg.trim()) {
      // Auto-generate standardized client code on the fly if new client
      const existingCodes = db.contacts.map((c) => c.contactCode).filter((c): c is string => Boolean(c));
      resolvedClientCode = generateClientCode(counterpartyOrg, existingCodes);
      resolvedCostCode = resolvedCostCode || generateDefaultCostCode(resolvedClientCode);
      resolvedRevenueCode = resolvedRevenueCode || generateDefaultRevenueCode(resolvedClientCode, 1);
    }
  }

  const newRecord: Correspondence = {
    id: `cor-${Date.now()}`,
    type: body.type,
    correspondenceNumber: number,
    sequenceNumber: sequence,
    officialDate: officialDate,
    createdDateTime: now.toISOString(),
    lastModifiedDateTime: now.toISOString(),
    actionPurpose: body.actionPurpose || (isInternal ? 'internal_instruction' : isOutgoing ? 'new_correspondence' : 'request_for_response'),
    subject: body.subject,
    bodyHtml: body.bodyHtml || '<p></p>',
    externalRefNumber: body.externalRefNumber || '',
    externalDate: body.externalDate || '',
    receivedThrough: body.receivedThrough || (isInternal ? 'internal_memo' : 'email'),
    senderOrg:
      body.senderOrg ||
      (isOutgoing || isInternal
        ? db.companySettings.companyName
        : 'External Organization'),
    senderPerson:
      body.senderPerson || (isOutgoing || isInternal ? currentUser.name : ''),
    senderEmail:
      body.senderEmail || (isOutgoing || isInternal ? currentUser.email : ''),
    recipientOrg:
      body.recipientOrg ||
      (isInternal ? db.companySettings.companyName : ''),
    recipientPerson: body.recipientPerson || '',
    recipientPosition: body.recipientPosition || '',
    recipientEmail: body.recipientEmail || '',
    showCcOnLetter: body.showCcOnLetter !== undefined ? Boolean(body.showCcOnLetter) : true,
    internalCcUserIds: Array.isArray(body.internalCcUserIds) ? body.internalCcUserIds : [],
    internalCcUserNames: Array.isArray(body.internalCcUserNames) ? body.internalCcUserNames : [],
    originDepartmentId:
      body.originDepartmentId ||
      (isInternal ? currentUser.departmentId : undefined),
    originDepartmentName:
      body.originDepartmentName ||
      (isInternal ? currentUser.departmentName : undefined),
    destinationDepartmentId: body.destinationDepartmentId,
    destinationDepartmentName: body.destinationDepartmentId
      ? db.departments.find((d) => d.id === body.destinationDepartmentId)?.name
      : undefined,
    currentResponsibleUserId: body.currentResponsibleUserId || body.assignedUserId,
    currentResponsibleUserName: body.currentResponsibleUserId
      ? db.users.find((u) => u.id === body.currentResponsibleUserId)?.name
      : body.assignedUserName,
    ccEmails: Array.isArray(body.ccEmails) ? body.ccEmails : [],
    bccEmails: Array.isArray(body.bccEmails) ? body.bccEmails : [],
    confidentiality: body.confidentiality || 'normal',
    priority: body.priority || 'normal',
    status:
      body.status ||
      (isOutgoing ? 'draft' : isInternal ? 'draft' : 'registered'),
    assignedDepartmentId: body.assignedDepartmentId,
    assignedDepartmentName: body.assignedDepartmentId
      ? db.departments.find((d) => d.id === body.assignedDepartmentId)?.name
      : undefined,
    assignedUserId: body.assignedUserId,
    assignedUserName: body.assignedUserId
      ? db.users.find((u) => u.id === body.assignedUserId)?.name
      : undefined,
    dueDate: body.dueDate,
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    signatureIncluded:
      body.signatureIncluded !== undefined
        ? body.signatureIncluded
        : isOutgoing || isInternal,
    signatoryName:
      body.signatoryName || (isInternal ? currentUser.name : db.companySettings.signature.signatoryName),
    signatoryPosition:
      body.signatoryPosition || (isInternal ? currentUser.role.toUpperCase() : db.companySettings.signature.position),
    templateId: body.templateId || db.companySettings.defaultTemplateId,
    relatedLinks: Array.isArray(body.relatedLinks) ? body.relatedLinks : [],
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    internalDistributions: [],
    history: [
      {
        id: `hist-${Date.now()}`,
        timestamp: now.toISOString(),
        type: 'registered',
        title:
          body.type === 'incoming'
            ? 'Incoming Correspondence Registered'
            : body.type === 'internal'
            ? 'Internal Correspondence Initiated'
            : 'Official Outgoing Draft Created',
        description: `Registered with reference ${number} - "${body.subject}"`,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      },
    ],
    versions: [
      {
        id: `ver-${Date.now()}`,
        versionNumber: isOutgoing || isInternal ? '0.1' : '1.0',
        subject: body.subject,
        bodyHtml: body.bodyHtml || '',
        modifiedBy: currentUser.name,
        modifiedAt: now.toISOString(),
        comment:
          isOutgoing
            ? 'Initial draft created'
            : isInternal
            ? 'Initial internal draft created'
            : 'Initial incoming registration',
      },
    ],
    isArchived: false,
    clientCode: resolvedClientCode,
    costCode: resolvedCostCode,
    revenueCode: resolvedRevenueCode,
    contractNumber: body.contractNumber || undefined,
    proformaInvoiceNumber: body.proformaInvoiceNumber || undefined,
    commercialValue: body.commercialValue !== undefined ? Number(body.commercialValue) : undefined,
    currency: body.currency || undefined,
  };

  // If this letter links to another letter as reply_to, update reciprocal link
  if (newRecord.relatedLinks.length > 0) {
    for (const rel of newRecord.relatedLinks) {
      const target = db.correspondence.find(
        (c) => c.id === rel.targetCorrespondenceId
      );
      if (target) {
        // Add reciprocal relationship
        const reciprocalType =
          rel.relationshipType === 'reply_to'
            ? 'response_to'
            : rel.relationshipType === 'response_to'
            ? 'reply_to'
            : 'related_to';
        target.relatedLinks = target.relatedLinks || [];
        target.relatedLinks.push({
          id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          targetCorrespondenceId: newRecord.id,
          targetCorrespondenceNumber: newRecord.correspondenceNumber,
          targetSubject: newRecord.subject,
          relationshipType: reciprocalType,
          direction: newRecord.type,
          date: newRecord.officialDate,
        });

        // Record history on the linked target correspondence
        target.history = target.history || [];
        target.history.unshift({
          id: `hist-link-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: now.toISOString(),
          type: 'response_drafted',
          title: `Linked to ${newRecord.correspondenceNumber}`,
          description: `Linked as ${reciprocalType.replace('_', ' ')} (${newRecord.subject})`,
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
        });
      }
    }
  }

  db.correspondence.unshift(newRecord);
  saveDatabase();

  // Audit Log
  recordAuditLog({
    correspondenceId: newRecord.id,
    action: body.type === 'incoming' ? 'REGISTERED' : 'CREATED_DRAFT',
    newValue: `${newRecord.correspondenceNumber} (${newRecord.subject})`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: `Initial creation of ${body.type} correspondence`,
  });

  res.status(201).json(newRecord);
});

// Update correspondence
apiRouter.put('/correspondence/:id', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const idx = db.correspondence.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const existing = db.correspondence[idx];
  const body = req.body;

  // Check if officialDate is being changed
  if (body.officialDate && body.officialDate !== existing.officialDate) {
    const isAlreadySent = existing.status === 'sent' || existing.status === 'issued';
    if (isAlreadySent) {
      if (currentUser.role !== 'admin') {
        return res.status(403).json({
          error:
            'Security Violation: Only Administrators have permission to modify the official correspondence date once a letter is officially issued or sent.',
        });
      }

      if (!body.adminDateReason || body.adminDateReason.trim() === '') {
        return res.status(400).json({
          error:
            'Mandatory Compliance Requirement: Administrator must supply an official justification/reason to modify correspondence date of an issued or sent record.',
        });
      }

      // Record special audit log
      recordAuditLog({
        correspondenceId: existing.id,
        action: 'ADMIN_DATE_MODIFICATION',
        previousValue: existing.officialDate,
        newValue: body.officialDate,
        performedByUserId: currentUser.id,
        performedByUserName: currentUser.name,
        reason: body.adminDateReason,
      });
    }

    existing.officialDate = body.officialDate;
  }

  // If body content changed, save a new version entry
  const hasBodyChanged =
    body.bodyHtml && body.bodyHtml !== existing.bodyHtml;
  const hasSubjectChanged =
    body.subject && body.subject !== existing.subject;

  if (hasBodyChanged || hasSubjectChanged) {
    const nextVer = `0.${existing.versions.length + 1}`;
    const newVersion: CorrespondenceVersion = {
      id: `ver-${Date.now()}`,
      versionNumber: nextVer,
      subject: body.subject || existing.subject,
      bodyHtml: body.bodyHtml || existing.bodyHtml,
      modifiedBy: currentUser.name,
      modifiedAt: new Date().toISOString(),
      comment: body.versionComment || 'Updated draft content',
    };
    existing.versions.unshift(newVersion);
  }

  // Update fields
  existing.subject = body.subject ?? existing.subject;
  existing.bodyHtml = body.bodyHtml ?? existing.bodyHtml;
  existing.actionPurpose = body.actionPurpose ?? existing.actionPurpose;
  existing.externalRefNumber =
    body.externalRefNumber ?? existing.externalRefNumber;
  existing.externalDate = body.externalDate ?? existing.externalDate;
  existing.receivedThrough =
    body.receivedThrough ?? existing.receivedThrough;
  existing.senderOrg = body.senderOrg ?? existing.senderOrg;
  existing.senderPerson = body.senderPerson ?? existing.senderPerson;
  existing.senderEmail = body.senderEmail ?? existing.senderEmail;
  existing.recipientOrg = body.recipientOrg ?? existing.recipientOrg;
  existing.recipientPerson =
    body.recipientPerson ?? existing.recipientPerson;
  existing.recipientEmail =
    body.recipientEmail ?? existing.recipientEmail;
  existing.ccEmails = body.ccEmails ?? existing.ccEmails;
  existing.bccEmails = body.bccEmails ?? existing.bccEmails;
  existing.confidentiality =
    body.confidentiality ?? existing.confidentiality;
  existing.priority = body.priority ?? existing.priority;
  existing.status = body.status ?? existing.status;
  existing.assignedDepartmentId =
    body.assignedDepartmentId ?? existing.assignedDepartmentId;
  existing.assignedDepartmentName = body.assignedDepartmentId
    ? db.departments.find((d) => d.id === body.assignedDepartmentId)?.name
    : existing.assignedDepartmentName;
  existing.assignedUserId =
    body.assignedUserId ?? existing.assignedUserId;
  existing.assignedUserName = body.assignedUserId
    ? db.users.find((u) => u.id === body.assignedUserId)?.name
    : existing.assignedUserName;
  existing.dueDate = body.dueDate ?? existing.dueDate;
  existing.signatureIncluded =
    body.signatureIncluded ?? existing.signatureIncluded;
  existing.signatoryName = body.signatoryName ?? existing.signatoryName;
  existing.signatoryPosition =
    body.signatoryPosition ?? existing.signatoryPosition;
  existing.recipientPosition = body.recipientPosition ?? existing.recipientPosition;
  existing.additionalRecipients = body.additionalRecipients ?? existing.additionalRecipients;
  existing.externalCcRecipients = body.externalCcRecipients ?? existing.externalCcRecipients;
  existing.showCcOnLetter = body.showCcOnLetter !== undefined ? body.showCcOnLetter : existing.showCcOnLetter;
  existing.internalCcUserIds = body.internalCcUserIds ?? existing.internalCcUserIds;
  existing.internalCcUserNames = body.internalCcUserNames ?? existing.internalCcUserNames;
  existing.originDepartmentId = body.originDepartmentId ?? existing.originDepartmentId;
  existing.originDepartmentName = body.originDepartmentName ?? existing.originDepartmentName;
  existing.destinationDepartmentId = body.destinationDepartmentId ?? existing.destinationDepartmentId;
  existing.destinationDepartmentName = body.destinationDepartmentName ?? existing.destinationDepartmentName;
  existing.autoUpdateDateOnSend = body.autoUpdateDateOnSend !== undefined ? body.autoUpdateDateOnSend : existing.autoUpdateDateOnSend;
  existing.templateId = body.templateId ?? existing.templateId;
  existing.relatedLinks = body.relatedLinks ?? existing.relatedLinks;
  existing.attachments = body.attachments ?? existing.attachments;

  // Commercial & Financial Traceability
  if (body.clientCode !== undefined) existing.clientCode = body.clientCode;
  if (body.costCode !== undefined) existing.costCode = body.costCode;
  if (body.revenueCode !== undefined) existing.revenueCode = body.revenueCode;
  if (body.contractNumber !== undefined) existing.contractNumber = body.contractNumber;
  if (body.proformaInvoiceNumber !== undefined) existing.proformaInvoiceNumber = body.proformaInvoiceNumber;
  if (body.commercialValue !== undefined) existing.commercialValue = body.commercialValue !== null ? Number(body.commercialValue) : undefined;
  if (body.currency !== undefined) existing.currency = body.currency;

  if (body.isArchived !== undefined) {
    existing.isArchived = body.isArchived;
    if (body.isArchived && !existing.archivedAt) {
      existing.archivedAt = new Date().toISOString();
    }
  }
  if (body.archiveFolderId !== undefined) {
    const oldFolderId = existing.archiveFolderId;
    existing.archiveFolderId = body.archiveFolderId || undefined;
    
    // Maintain folder's correspondenceIds
    if (db.archiveFolders) {
      if (oldFolderId && oldFolderId !== body.archiveFolderId) {
        const oldFolder = db.archiveFolders.find((f) => f.id === oldFolderId);
        if (oldFolder && oldFolder.correspondenceIds) {
          oldFolder.correspondenceIds = oldFolder.correspondenceIds.filter((cid) => cid !== existing.id);
        }
      }
      if (body.archiveFolderId) {
        const targetFolder = db.archiveFolders.find((f) => f.id === body.archiveFolderId);
        if (targetFolder) {
          targetFolder.correspondenceIds = targetFolder.correspondenceIds || [];
          if (!targetFolder.correspondenceIds.includes(existing.id)) {
            targetFolder.correspondenceIds.push(existing.id);
          }
        }
      }
    }
  }
  if (body.archiveNotes !== undefined) {
    existing.archiveNotes = body.archiveNotes;
  }

  existing.lastModifiedDateTime = new Date().toISOString();

  saveDatabase();

  recordAuditLog({
    correspondenceId: existing.id,
    action: 'RECORD_UPDATED',
    newValue: `Status: ${existing.status}, Subject: ${existing.subject}`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: body.versionComment || 'Saved correspondence changes',
  });

  res.json(existing);
});

// Update Status (Workflow Transitions: Submit for Review, Approve, Reject, Issue, Send)
apiRouter.post(
  '/correspondence/:id/transition',
  (req: Request, res: Response) => {
    const db = getDb();
    const currentUser = getCurrentUser();
    const item = db.correspondence.find((c) => c.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Correspondence not found' });
    }

    const { newStatus, notes } = req.body;
    const oldStatus = item.status;

    // Permissions check
    if (newStatus === 'approved' && !['admin', 'manager'].includes(currentUser.role)) {
      return res.status(403).json({
        error: 'Permission Denied: Only Managers and Admins can approve correspondence.',
      });
    }

    item.status = newStatus;
    item.lastModifiedDateTime = new Date().toISOString();

    let historyType: any = 'status_transition';
    let historyTitle = `Status changed to ${newStatus.replace('_', ' ')}`;

    if (newStatus === 'approved') {
      item.approverUserId = currentUser.id;
      item.approverUserName = currentUser.name;
      item.approvalNotes = notes || 'Formally approved for issuance.';
      item.approvalDate = new Date().toISOString();
      historyType = 'approved';
      historyTitle = `Approved by ${currentUser.name}`;
    } else if (newStatus === 'draft') {
      if (oldStatus === 'awaiting_approval' || oldStatus === 'under_review') {
        historyType = 'rejected';
        historyTitle = `Returned for Revisions by ${currentUser.name}`;
      }
    } else if (newStatus === 'issued' || newStatus === 'sent') {
      const sendDate = new Date().toISOString().split('T')[0];
      item.sentAt = new Date().toISOString();
      item.officialDate = sendDate;
      item.dateSent = sendDate;
      historyType = 'dispatched_externally';
      historyTitle = `Dispatched Externally`;
    }

    // Append to correspondence history
    item.history = item.history || [];
    item.history.unshift({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      type: historyType,
      title: historyTitle,
      description: notes || `Workflow status transitioned from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
    });

    saveDatabase();

    recordAuditLog({
      correspondenceId: item.id,
      action: `STATUS_${newStatus.toUpperCase()}`,
      previousValue: oldStatus,
      newValue: newStatus,
      performedByUserId: currentUser.id,
      performedByUserName: currentUser.name,
      reason: notes || `Workflow transition from ${oldStatus} to ${newStatus}`,
    });

    res.json({ success: true, correspondence: item });
  }
);

// Void official number
apiRouter.post('/correspondence/:id/void', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  if (currentUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Only Administrators have authority to void official correspondence numbers.',
    });
  }

  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const { reason } = req.body;
  if (!reason) {
    return res
      .status(400)
      .json({ error: 'A justification is required to void this number.' });
  }

  item.status = 'voided';
  item.voidedReason = reason;

  // Add to voided numbers list so it is preserved and auditable
  db.numberSequences.voidedNumbers.push({
    number: item.correspondenceNumber,
    type: item.type,
    voidedAt: new Date().toISOString(),
    reason,
    voidedBy: currentUser.name,
  });

  // History entry
  item.history = item.history || [];
  item.history.unshift({
    id: `hist-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'status_transition',
    title: 'Correspondence Number Voided',
    description: `Official number voided. Reason: ${reason}`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  });

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    action: 'NUMBER_VOIDED',
    previousValue: item.correspondenceNumber,
    newValue: 'VOIDED',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason,
  });

  res.json({ success: true, correspondence: item });
});

// Permanently delete correspondence & roll back sequence counter
apiRouter.delete('/correspondence/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser();
  const reason = (req.body && req.body.reason) || req.query.reason as string || 'Permanently deleted by user';
  const result = deleteCorrespondenceFromDb(req.params.id, currentUser.id, currentUser.name, reason);

  if (!result.success) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  res.json({
    success: true,
    message: `Correspondence ${result.deletedItem?.correspondenceNumber} deleted successfully.`,
    deletedItem: result.deletedItem,
    newCurrentSeq: result.newCurrentSeq,
  });
});

// Recalibrate / synchronize all number sequences based on actual existing correspondence
apiRouter.post('/settings/recalibrate-sequences', (req: Request, res: Response) => {
  const incomingSeq = recalculateSequence('incoming');
  const outgoingSeq = recalculateSequence('outgoing');
  const internalSeq = recalculateSequence('internal');
  const db = getDb();

  res.json({
    success: true,
    message: 'Sequences recalibrated against existing correspondence records.',
    sequences: {
      incoming: incomingSeq,
      outgoing: outgoingSeq,
      internal: internalSeq,
    },
    numberSequences: db.numberSequences,
  });
});

// Direct "Send Internally" distribution endpoint
apiRouter.post('/correspondence/:id/distribute-internal', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const {
    responsibleUserId,
    ccUserIds,
    instructions,
    actionPurpose,
    dueDate,
    note,
    attachments,
  } = req.body;

  if (!responsibleUserId || !instructions) {
    return res.status(400).json({
      error: 'A responsible responder and internal instructions are required.',
    });
  }

  const responsibleUser = db.users.find((u) => u.id === responsibleUserId);
  if (!responsibleUser) {
    return res.status(404).json({ error: 'Responsible responder user not found.' });
  }

  const ccUsers = Array.isArray(ccUserIds)
    ? db.users.filter((u) => ccUserIds.includes(u.id))
    : [];

  const ccDepartmentNames = Array.from(
    new Set(ccUsers.map((u) => u.departmentName).filter(Boolean))
  );

  const now = new Date();

  // Create formal InternalDistribution record
  const distributionRecord = {
    id: `dist-${Date.now()}`,
    sentAt: now.toISOString(),
    sentByUserId: currentUser.id,
    sentByUserName: currentUser.name,
    responsibleUserId: responsibleUser.id,
    responsibleUserName: responsibleUser.name,
    responsibleDepartmentId: responsibleUser.departmentId,
    responsibleDepartmentName: responsibleUser.departmentName,
    ccUserIds: ccUsers.map((u) => u.id),
    ccUserNames: ccUsers.map((u) => u.name),
    ccDepartmentNames,
    instructions,
    actionPurpose: actionPurpose || 'for_action',
    dueDate: dueDate || item.dueDate,
    note: note || '',
    attachments: Array.isArray(attachments) ? attachments : [],
  };

  item.internalDistributions = item.internalDistributions || [];
  item.internalDistributions.unshift(distributionRecord);

  // Update primary current responsible & assigned officer
  item.currentResponsibleUserId = responsibleUser.id;
  item.currentResponsibleUserName = responsibleUser.name;
  item.assignedUserId = responsibleUser.id;
  item.assignedUserName = responsibleUser.name;
  item.assignedDepartmentId = responsibleUser.departmentId;
  item.assignedDepartmentName = responsibleUser.departmentName;
  if (dueDate) {
    item.dueDate = dueDate;
  }
  item.lastModifiedDateTime = now.toISOString();

  // Status transition if appropriate
  if (item.type === 'incoming' && item.status === 'registered') {
    item.status = 'assigned';
  } else if (item.type === 'internal' && ['draft', 'registered'].includes(item.status)) {
    item.status = 'in_circulation';
  }

  // Create primary actionable task for responsible officer
  const primaryTask: Task = {
    id: `tsk-${Date.now()}-primary`,
    correspondenceId: item.id,
    correspondenceNumber: item.correspondenceNumber,
    correspondenceSubject: item.subject,
    correspondenceType: item.type,
    assignedUserId: responsibleUser.id,
    assignedUserName: responsibleUser.name,
    assignedDepartmentId: responsibleUser.departmentId,
    assignedDepartmentName: responsibleUser.departmentName,
    taskType: actionPurpose || 'for_action',
    instructions,
    priority: item.priority || 'normal',
    dueDate: dueDate || item.dueDate || now.toISOString().split('T')[0],
    status: 'assigned',
    createdAt: now.toISOString(),
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    comments: [],
  };
  db.tasks.unshift(primaryTask);

  // Create informational tasks for CC colleagues
  ccUsers.forEach((ccUser) => {
    const ccTask: Task = {
      id: `tsk-${Date.now()}-cc-${ccUser.id}`,
      correspondenceId: item.id,
      correspondenceNumber: item.correspondenceNumber,
      correspondenceSubject: item.subject,
      correspondenceType: item.type,
      assignedUserId: ccUser.id,
      assignedUserName: ccUser.name,
      assignedDepartmentId: ccUser.departmentId,
      assignedDepartmentName: ccUser.departmentName,
      taskType: 'for_information',
      instructions: `[CC Notification] Responsible Officer: ${responsibleUser.name}. Instructions: ${instructions}`,
      priority: 'normal',
      dueDate: dueDate || item.dueDate || now.toISOString().split('T')[0],
      status: 'assigned',
      createdAt: now.toISOString(),
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      comments: [],
    };
    db.tasks.unshift(ccTask);
  });

  // Attach optional internal attachments to document if not already present
  if (Array.isArray(attachments) && attachments.length > 0) {
    item.attachments = item.attachments || [];
    attachments.forEach((att: any) => {
      if (!item.attachments.some((ea) => ea.id === att.id)) {
        item.attachments.push(att);
      }
    });
  }

  // Record rich chronological history event
  const ccNamesStr = ccUsers.map((u) => u.name).join(', ');
  item.history = item.history || [];
  item.history.unshift({
    id: `hist-${Date.now()}`,
    timestamp: now.toISOString(),
    type: 'sent_internally',
    title: `Sent Internally to ${responsibleUser.name}`,
    description: `Designated as primary responder for ${actionPurpose ? actionPurpose.replace('_', ' ') : 'action'}: "${instructions}"${ccNamesStr ? ` (CC: ${ccNamesStr})` : ''}`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    metadata: {
      responsibleUser: responsibleUser.name,
      ccUsers: ccUsers.map((u) => u.name),
      notes: note,
    },
  });

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    action: 'INTERNAL_DISTRIBUTION',
    newValue: `Sent to ${responsibleUser.name} (Resp) & CC: ${ccNamesStr || 'None'}`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: instructions,
  });

  res.status(201).json({
    success: true,
    distribution: distributionRecord,
    task: primaryTask,
    correspondence: item,
  });
});

// Backward-compatible Internal Forwarding alias
apiRouter.post('/correspondence/:id/forward', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const {
    assignedUserId,
    assignedDepartmentId,
    actionType,
    instructions,
    priority,
    dueDate,
  } = req.body;

  if (!assignedUserId || !actionType || !dueDate) {
    return res.status(400).json({
      error: 'Assigned User, Action Type, and Due Date are required to forward.',
    });
  }

  const assignedUser = db.users.find((u) => u.id === assignedUserId);
  const assignedDept = db.departments.find(
    (d) => d.id === assignedDepartmentId
  );

  const newTask: Task = {
    id: `tsk-${Date.now()}`,
    correspondenceId: item.id,
    correspondenceNumber: item.correspondenceNumber,
    correspondenceSubject: item.subject,
    correspondenceType: item.type,
    assignedUserId: assignedUser?.id || assignedUserId,
    assignedUserName: assignedUser?.name || 'Unassigned',
    assignedDepartmentId: assignedDept?.id || '',
    assignedDepartmentName: assignedDept?.name || '',
    taskType: actionType,
    instructions: instructions || 'Please review and take required action.',
    priority: priority || 'normal',
    dueDate,
    status: 'assigned',
    createdAt: new Date().toISOString(),
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    comments: [],
  };

  db.tasks.unshift(newTask);

  // Update correspondence current assignment
  item.assignedUserId = newTask.assignedUserId;
  item.assignedUserName = newTask.assignedUserName;
  item.currentResponsibleUserId = newTask.assignedUserId;
  item.currentResponsibleUserName = newTask.assignedUserName;
  item.assignedDepartmentId = newTask.assignedDepartmentId;
  item.assignedDepartmentName = newTask.assignedDepartmentName;
  item.dueDate = dueDate;
  item.lastModifiedDateTime = new Date().toISOString();
  if (item.type === 'incoming' && item.status === 'registered') {
    item.status = 'assigned';
  }

  // Also add distribution record and history
  item.internalDistributions = item.internalDistributions || [];
  item.internalDistributions.unshift({
    id: `dist-${Date.now()}`,
    sentAt: new Date().toISOString(),
    sentByUserId: currentUser.id,
    sentByUserName: currentUser.name,
    responsibleUserId: newTask.assignedUserId,
    responsibleUserName: newTask.assignedUserName,
    responsibleDepartmentId: newTask.assignedDepartmentId,
    responsibleDepartmentName: newTask.assignedDepartmentName,
    ccUserIds: [],
    ccUserNames: [],
    instructions: instructions || 'Forwarded for action',
    actionPurpose: actionType,
    dueDate,
  });

  item.history = item.history || [];
  item.history.unshift({
    id: `hist-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'sent_internally',
    title: `Sent internally to ${newTask.assignedUserName}`,
    description: `Forwarded for ${actionType.replace('_', ' ')} (${instructions || 'No instructions provided'})`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  });

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    taskId: newTask.id,
    action: 'INTERNAL_FORWARD',
    newValue: `Assigned to ${newTask.assignedUserName} for ${actionType} (Due: ${dueDate})`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: instructions,
  });

  res.status(201).json({ success: true, task: newTask, correspondence: item });
});

// Link related correspondence with bidirectional tracking & history
apiRouter.post('/correspondence/:id/link', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const source = db.correspondence.find((c) => c.id === req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Source correspondence not found' });
  }

  const { targetId, relationshipType } = req.body;
  const target = db.correspondence.find((c) => c.id === targetId);
  if (!target) {
    return res.status(404).json({ error: 'Target correspondence not found' });
  }

  const now = new Date();
  source.relatedLinks = source.relatedLinks || [];
  target.relatedLinks = target.relatedLinks || [];

  // Check if link already exists
  const existingSourceLink = source.relatedLinks.find(
    (l) => l.targetCorrespondenceId === target.id
  );
  if (!existingSourceLink) {
    source.relatedLinks.push({
      id: `rel-${Date.now()}-1`,
      targetCorrespondenceId: target.id,
      targetCorrespondenceNumber: target.correspondenceNumber,
      targetSubject: target.subject,
      relationshipType: relationshipType || 'related_to',
      direction: target.type,
      date: target.officialDate,
    });
  }

  // Reciprocal
  const reciprocalType =
    relationshipType === 'reply_to'
      ? 'response_to'
      : relationshipType === 'response_to'
      ? 'reply_to'
      : relationshipType === 'followup_to'
      ? 'preceded_by'
      : 'related_to';

  const existingTargetLink = target.relatedLinks.find(
    (l) => l.targetCorrespondenceId === source.id
  );
  if (!existingTargetLink) {
    target.relatedLinks.push({
      id: `rel-${Date.now()}-2`,
      targetCorrespondenceId: source.id,
      targetCorrespondenceNumber: source.correspondenceNumber,
      targetSubject: source.subject,
      relationshipType: reciprocalType,
      direction: source.type,
      date: source.officialDate,
    });
  }

  // Record history on both items
  source.history = source.history || [];
  source.history.unshift({
    id: `hist-link-${Date.now()}-1`,
    timestamp: now.toISOString(),
    type: 'linked_correspondence',
    title: `Linked to ${target.correspondenceNumber}`,
    description: `Connected as ${relationshipType.replace('_', ' ')} to "${target.subject}"`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  });

  target.history = target.history || [];
  target.history.unshift({
    id: `hist-link-${Date.now()}-2`,
    timestamp: now.toISOString(),
    type: 'linked_correspondence',
    title: `Linked to ${source.correspondenceNumber}`,
    description: `Reciprocally linked as ${reciprocalType.replace('_', ' ')} to "${source.subject}"`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  });

  saveDatabase();

  recordAuditLog({
    correspondenceId: source.id,
    action: 'CORRESPONDENCE_LINKED',
    newValue: `Linked ${source.correspondenceNumber} <-> ${target.correspondenceNumber}`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: `Relationship: ${relationshipType}`,
  });

  res.json({ success: true, source, target });
});

// Add file/attachment with history recording
apiRouter.post('/correspondence/:id/attachments', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const { fileName, fileType, fileSize, url } = req.body;
  if (!fileName) {
    return res.status(400).json({ error: 'File name is required' });
  }

  const newAttachment = {
    id: `att-${Date.now()}`,
    fileName,
    fileType: fileType || 'application/pdf',
    fileSize: fileSize || 102400,
    url: url || '',
    uploadedBy: currentUser.name,
    uploadedAt: new Date().toISOString(),
  };

  item.attachments = item.attachments || [];
  item.attachments.push(newAttachment);
  item.lastModifiedDateTime = new Date().toISOString();

  item.history = item.history || [];
  item.history.unshift({
    id: `hist-att-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'attachment_added',
    title: `Attachment added: ${fileName}`,
    description: `Uploaded by ${currentUser.name} (${Math.round(newAttachment.fileSize / 1024)} KB)`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  });

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    action: 'ATTACHMENT_ADDED',
    newValue: fileName,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
  });

  res.status(201).json({ success: true, attachment: newAttachment, correspondence: item });
});

// Update Due Date with history tracking
apiRouter.put('/correspondence/:id/due-date', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const { dueDate, reason } = req.body;
  const oldDate = item.dueDate;
  item.dueDate = dueDate;
  item.lastModifiedDateTime = new Date().toISOString();

  item.history = item.history || [];
  item.history.unshift({
    id: `hist-date-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'due_date_updated',
    title: `Due date updated to ${dueDate || 'None'}`,
    description: reason ? `Reason: ${reason}` : `Changed from ${oldDate || 'unset'} to ${dueDate}`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  });

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    action: 'DUE_DATE_UPDATED',
    previousValue: oldDate || 'None',
    newValue: dueDate || 'None',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: reason || 'Due date adjusted',
  });

  res.json({ success: true, correspondence: item });
});

// Manual history event insertion
apiRouter.post('/correspondence/:id/history', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const { title, description, type } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const event = {
    id: `hist-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: type || 'note_added',
    title,
    description: description || '',
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  };

  item.history = item.history || [];
  item.history.unshift(event);
  item.lastModifiedDateTime = new Date().toISOString();

  saveDatabase();
  res.status(201).json({ success: true, event, correspondence: item });
});

// Post Internal Communication / Response / Thread Activity into correspondence
apiRouter.post('/correspondence/:id/communication', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const {
    message,
    activityType = 'internal_message',
    responsibleUserId,
    ccUserIds,
    dueDate,
    attachments,
    relatedCorrespondenceId,
  } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const now = new Date();
  const responsibleUser = responsibleUserId
    ? db.users.find((u) => u.id === responsibleUserId)
    : item.assignedUserId
    ? db.users.find((u) => u.id === item.assignedUserId)
    : undefined;

  const ccUsers = Array.isArray(ccUserIds)
    ? db.users.filter((u) => ccUserIds.includes(u.id))
    : [];

  const ccNamesStr = ccUsers.map((u) => u.name).join(', ');

  // Compute title e.g. "Sarah Jenkins → You" or "You → Sarah Jenkins (Request for response)"
  const recipientDisplay = responsibleUser ? responsibleUser.name : (item.assignedUserName || 'Internal Team');
  let activityLabel = 'Internal Message';
  if (activityType === 'request_response') activityLabel = 'Request for response';
  else if (activityType === 'response') activityLabel = 'Response';
  else if (activityType === 'reply') activityLabel = 'Reply';
  else if (activityType === 'instruction') activityLabel = 'Instruction';

  const title = `${currentUser.name} → ${recipientDisplay} (${activityLabel})`;
  const cleanExcerpt = message.replace(/<[^>]*>?/gm, '').trim();
  const description = cleanExcerpt.length > 90 ? cleanExcerpt.substring(0, 90) + '...' : cleanExcerpt;

  // Append new attachments if provided
  const parsedAttachments = Array.isArray(attachments) ? attachments : [];
  if (parsedAttachments.length > 0) {
    item.attachments = item.attachments || [];
    parsedAttachments.forEach((att: any) => {
      if (!item.attachments.some((ea) => ea.id === att.id)) {
        item.attachments.push({
          id: att.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          fileName: att.fileName || att.name || 'Attachment',
          fileType: att.fileType || att.type || 'application/pdf',
          fileSize: att.fileSize || att.size || 51200,
          url: att.url || '#',
          uploadedBy: currentUser.name,
          uploadedAt: now.toISOString(),
          isInternal: true,
          description: att.description,
        });
      }
    });
  }

  // Related correspondence link if passed
  let relatedItemNumber: string | undefined;
  if (relatedCorrespondenceId) {
    const relatedTarget = db.correspondence.find((c) => c.id === relatedCorrespondenceId);
    if (relatedTarget) {
      relatedItemNumber = relatedTarget.correspondenceNumber;
      item.relatedLinks = item.relatedLinks || [];
      if (!item.relatedLinks.some((l) => l.targetCorrespondenceId === relatedTarget.id)) {
        item.relatedLinks.push({
          id: `rel-${Date.now()}`,
          targetCorrespondenceId: relatedTarget.id,
          targetCorrespondenceNumber: relatedTarget.correspondenceNumber,
          targetSubject: relatedTarget.subject,
          relationshipType: 'related_to',
          direction: relatedTarget.type,
          date: relatedTarget.officialDate,
        });
      }
    }
  }

  // Create chronological history event
  const newHistoryEvent = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: now.toISOString(),
    type:
      activityType === 'response'
        ? ('internal_response' as const)
        : activityType === 'reply'
        ? ('internal_reply' as const)
        : activityType === 'instruction'
        ? ('instruction' as const)
        : ('internal_message' as const),
    title,
    description,
    fullMessage: message,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    senderName: currentUser.name,
    recipientName: recipientDisplay,
    responsibleUser: responsibleUser?.name,
    ccUsers: ccUsers.map((u) => u.name),
    attachments: parsedAttachments,
    relatedNumber: relatedItemNumber,
    metadata: {
      responsibleUser: responsibleUser?.name,
      ccUsers: ccUsers.map((u) => u.name),
      fullMessage: message,
      notes: dueDate ? `Due Date: ${dueDate}` : undefined,
    },
  };

  item.history = item.history || [];
  item.history.unshift(newHistoryEvent);
  item.lastModifiedDateTime = now.toISOString();

  // If responsible user was specified or changed
  if (responsibleUser) {
    item.currentResponsibleUserId = responsibleUser.id;
    item.currentResponsibleUserName = responsibleUser.name;
    item.assignedUserId = responsibleUser.id;
    item.assignedUserName = responsibleUser.name;
    item.assignedDepartmentId = responsibleUser.departmentId;
    item.assignedDepartmentName = responsibleUser.departmentName;

    // Create a task notification for the responsible responder
    const primaryTask: Task = {
      id: `tsk-${Date.now()}-resp`,
      correspondenceId: item.id,
      correspondenceNumber: item.correspondenceNumber,
      correspondenceSubject: item.subject,
      correspondenceType: item.type,
      assignedUserId: responsibleUser.id,
      assignedUserName: responsibleUser.name,
      assignedDepartmentId: responsibleUser.departmentId,
      assignedDepartmentName: responsibleUser.departmentName,
      taskType: activityType === 'response' || activityType === 'reply' ? 'for_response' : 'for_action',
      instructions: cleanExcerpt,
      priority: item.priority || 'normal',
      dueDate: dueDate || item.dueDate || now.toISOString().split('T')[0],
      status: 'assigned',
      createdAt: now.toISOString(),
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      comments: [],
    };
    db.tasks.unshift(primaryTask);
  }

  // Create CC notification tasks
  ccUsers.forEach((ccUser) => {
    const ccTask: Task = {
      id: `tsk-${Date.now()}-cc-${ccUser.id}`,
      correspondenceId: item.id,
      correspondenceNumber: item.correspondenceNumber,
      correspondenceSubject: item.subject,
      correspondenceType: item.type,
      assignedUserId: ccUser.id,
      assignedUserName: ccUser.name,
      assignedDepartmentId: ccUser.departmentId,
      assignedDepartmentName: ccUser.departmentName,
      taskType: 'for_information',
      instructions: `[CC Notification from ${currentUser.name}] ${cleanExcerpt}`,
      priority: 'normal',
      dueDate: dueDate || item.dueDate || now.toISOString().split('T')[0],
      status: 'assigned',
      createdAt: now.toISOString(),
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      comments: [],
    };
    db.tasks.unshift(ccTask);
  });

  if (dueDate) {
    item.dueDate = dueDate;
  }

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    action: 'INTERNAL_COMMUNICATION',
    newValue: title,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: cleanExcerpt.substring(0, 120),
  });

  res.status(201).json({
    success: true,
    event: newHistoryEvent,
    correspondence: item,
  });
});

// Quick Assign / Reassign Responsible Responder
apiRouter.post('/correspondence/:id/assign', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const { assignedUserId, dueDate, instructions } = req.body;
  if (!assignedUserId) {
    return res.status(400).json({ error: 'Assigned user ID is required' });
  }

  const targetUser = db.users.find((u) => u.id === assignedUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const oldAssignee = item.assignedUserName || 'Unassigned';
  item.assignedUserId = targetUser.id;
  item.assignedUserName = targetUser.name;
  item.currentResponsibleUserId = targetUser.id;
  item.currentResponsibleUserName = targetUser.name;
  item.assignedDepartmentId = targetUser.departmentId;
  item.assignedDepartmentName = targetUser.departmentName;
  if (dueDate) item.dueDate = dueDate;
  item.lastModifiedDateTime = new Date().toISOString();

  // Record history
  item.history = item.history || [];
  item.history.unshift({
    id: `hist-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'sent_internally',
    title: `Assigned to ${targetUser.name}`,
    description: instructions || `Reassigned from ${oldAssignee} to ${targetUser.name} (${targetUser.departmentName})`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    responsibleUser: targetUser.name,
  });

  // Create task for user
  const newTask: Task = {
    id: `tsk-${Date.now()}`,
    correspondenceId: item.id,
    correspondenceNumber: item.correspondenceNumber,
    correspondenceSubject: item.subject,
    correspondenceType: item.type,
    assignedUserId: targetUser.id,
    assignedUserName: targetUser.name,
    assignedDepartmentId: targetUser.departmentId,
    assignedDepartmentName: targetUser.departmentName,
    taskType: 'for_action',
    instructions: instructions || `Assigned correspondence: ${item.subject}`,
    priority: item.priority || 'normal',
    dueDate: dueDate || item.dueDate || new Date().toISOString().split('T')[0],
    status: 'assigned',
    createdAt: new Date().toISOString(),
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    comments: [],
  };
  db.tasks.unshift(newTask);

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    action: 'RESPONSIBLE_ASSIGNED',
    previousValue: oldAssignee,
    newValue: targetUser.name,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: instructions || 'Assigned responsible officer',
  });

  res.json({ success: true, correspondence: item, task: newTask });
});

// Make a Copy of correspondence as a fresh draft
apiRouter.post('/correspondence/:id/copy', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const source = db.correspondence.find((c) => c.id === req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Source correspondence not found' });
  }

  // Generate sequence-safe fresh number
  const deptCode = source.assignedDepartmentId
    ? db.departments.find((d) => d.id === source.assignedDepartmentId)?.code
    : undefined;

  const { number, sequence } = generateCorrespondenceNumber(source.type, deptCode);
  const now = new Date();
  const officialDate = now.toISOString().split('T')[0];

  const copied: Correspondence = {
    ...source,
    id: `cor-${Date.now()}`,
    correspondenceNumber: number,
    sequenceNumber: sequence,
    officialDate,
    createdDateTime: now.toISOString(),
    lastModifiedDateTime: now.toISOString(),
    subject: `Copy of ${source.subject}`,
    status: 'draft',
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    sentAt: undefined,
    approverUserId: undefined,
    approverUserName: undefined,
    approvalNotes: undefined,
    approvalDate: undefined,
    voidedReason: undefined,
    isArchived: false,
    history: [
      {
        id: `hist-${Date.now()}`,
        timestamp: now.toISOString(),
        type: 'registered',
        title: `Draft created from copy of ${source.correspondenceNumber}`,
        description: `Cloned subject, text, and structure as draft.`,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      },
    ],
    versions: [
      {
        id: `ver-${Date.now()}`,
        versionNumber: '0.1',
        subject: `Copy of ${source.subject}`,
        bodyHtml: source.bodyHtml,
        modifiedBy: currentUser.name,
        modifiedAt: now.toISOString(),
        comment: `Copied from ${source.correspondenceNumber}`,
      },
    ],
    relatedLinks: [
      {
        id: `rel-${Date.now()}`,
        targetCorrespondenceId: source.id,
        targetCorrespondenceNumber: source.correspondenceNumber,
        targetSubject: source.subject,
        relationshipType: 'related_to',
        direction: source.type,
        date: source.officialDate,
      },
    ],
    internalDistributions: [],
  };

  db.correspondence.unshift(copied);
  saveDatabase();

  recordAuditLog({
    correspondenceId: copied.id,
    action: 'COPIED_FROM_EXISTING',
    newValue: `${copied.correspondenceNumber} (from ${source.correspondenceNumber})`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
  });

  res.status(201).json(copied);
});

// Toggle Archive status
apiRouter.post('/correspondence/:id/archive', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  item.isArchived = !item.isArchived;
  item.lastModifiedDateTime = new Date().toISOString();

  // Log in history
  item.history = item.history || [];
  item.history.unshift({
    id: `hist-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'status_transition',
    title: item.isArchived ? 'Correspondence Archived' : 'Correspondence Restored from Archive',
    description: `Archived status toggled by ${currentUser.name}`,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  });

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    action: item.isArchived ? 'ARCHIVED' : 'RESTORED_FROM_ARCHIVE',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
  });

  res.json({ success: true, correspondence: item });
});

// -------------------------------------------------------------
// TASKS MANAGEMENT
// -------------------------------------------------------------
apiRouter.get('/tasks', (req: Request, res: Response) => {
  const db = getDb();
  const { assignedToMe, status, priority } = req.query;
  const currentUser = getCurrentUser();

  let list = db.tasks;

  if (assignedToMe === 'true') {
    list = list.filter((t) => t.assignedUserId === currentUser.id);
  }

  if (status) {
    list = list.filter((t) => t.status === status);
  }

  if (priority) {
    list = list.filter((t) => t.priority === priority);
  }

  // Sort by dueDate
  list.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  res.json(list);
});

apiRouter.put('/tasks/:id', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { status, completionComment, forwardToUserId } = req.body;
  const oldStatus = task.status;

  if (status) {
    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date().toISOString();
      task.completionComment = completionComment || 'Completed action.';
    }
  }

  if (forwardToUserId) {
    const newUser = db.users.find((u) => u.id === forwardToUserId);
    if (newUser) {
      task.assignedUserId = newUser.id;
      task.assignedUserName = newUser.name;
      task.assignedDepartmentId = newUser.departmentId;
      task.assignedDepartmentName = newUser.departmentName;
    }
  }

  saveDatabase();

  recordAuditLog({
    correspondenceId: task.correspondenceId,
    taskId: task.id,
    action: `TASK_${task.status.toUpperCase()}`,
    previousValue: oldStatus,
    newValue: task.status,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: completionComment,
  });

  res.json(task);
});

apiRouter.post('/tasks/:id/comments', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { comment, attachments } = req.body;
  if (!comment) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  const newComment = {
    id: `tcm-${Date.now()}`,
    taskId: task.id,
    userId: currentUser.id,
    userName: currentUser.name,
    comment,
    createdAt: new Date().toISOString(),
    attachments: attachments || [],
  };

  task.comments.push(newComment);
  saveDatabase();

  recordAuditLog({
    correspondenceId: task.correspondenceId,
    taskId: task.id,
    action: 'TASK_COMMENT_ADDED',
    newValue: comment.slice(0, 80),
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
  });

  res.status(201).json(newComment);
});

// -------------------------------------------------------------
// CONTACTS
// -------------------------------------------------------------
apiRouter.get('/contacts', (req: Request, res: Response) => {
  const db = getDb();
  const { search, type } = req.query;
  let list = db.contacts;

  if (type) {
    list = list.filter((c) => c.contactType === type);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      (c) =>
        c.orgName.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

apiRouter.post('/contacts', (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body;

  if (!body.orgName || !body.contactPerson || !body.email) {
    return res.status(400).json({
      error: 'Organization Name, Contact Person, and Email are required.',
    });
  }

  // Automatic standardized client/counterparty code allocation
  const existingCodes = db.contacts
    .map((c) => c.contactCode)
    .filter((code): code is string => Boolean(code));
  const allocatedClientCode = body.contactCode && body.contactCode.trim()
    ? body.contactCode.trim().toUpperCase()
    : generateClientCode(body.orgName, existingCodes);

  const defaultCostCode = body.defaultCostCode && body.defaultCostCode.trim()
    ? body.defaultCostCode.trim()
    : generateDefaultCostCode(allocatedClientCode);

  const defaultRevenueCode = body.defaultRevenueCode && body.defaultRevenueCode.trim()
    ? body.defaultRevenueCode.trim()
    : generateDefaultRevenueCode(allocatedClientCode, 1);

  const newContact: Contact = {
    id: `cnt-${Date.now()}`,
    orgName: body.orgName,
    contactCode: allocatedClientCode,
    defaultCostCode,
    defaultRevenueCode,
    industrySector: body.industrySector || '',
    contactPerson: body.contactPerson,
    position: body.position || '',
    department: body.department || '',
    email: body.email,
    ccEmails: Array.isArray(body.ccEmails) ? body.ccEmails : [],
    phone: body.phone || '',
    address: body.address || '',
    country: body.country || 'United States',
    notes: body.notes || '',
    contactType: body.contactType || 'company',
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.contacts.unshift(newContact);
  saveDatabase();
  res.status(201).json(newContact);
});

apiRouter.put('/contacts/:id', (req: Request, res: Response) => {
  const db = getDb();
  const contact = db.contacts.find((c) => c.id === req.params.id);
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const b = req.body;
  if (b.orgName !== undefined) contact.orgName = b.orgName;
  if (b.contactCode !== undefined) contact.contactCode = b.contactCode.trim().toUpperCase();
  if (b.defaultCostCode !== undefined) contact.defaultCostCode = b.defaultCostCode;
  if (b.defaultRevenueCode !== undefined) contact.defaultRevenueCode = b.defaultRevenueCode;
  if (b.industrySector !== undefined) contact.industrySector = b.industrySector;
  if (b.contactPerson !== undefined) contact.contactPerson = b.contactPerson;
  if (b.position !== undefined) contact.position = b.position;
  if (b.department !== undefined) contact.department = b.department;
  if (b.email !== undefined) contact.email = b.email;
  if (b.phone !== undefined) contact.phone = b.phone;
  if (b.address !== undefined) contact.address = b.address;
  if (b.country !== undefined) contact.country = b.country;
  if (b.notes !== undefined) contact.notes = b.notes;
  if (b.contactType !== undefined) contact.contactType = b.contactType;
  if (b.active !== undefined) contact.active = b.active;

  saveDatabase();
  res.json(contact);
});

apiRouter.delete('/contacts/:id', (req: Request, res: Response) => {
  const db = getDb();
  const idx = db.contacts.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  db.contacts.splice(idx, 1);
  saveDatabase();
  res.json({ success: true });
});

// -------------------------------------------------------------
// EMAIL SENDING & RECORDING
// -------------------------------------------------------------
apiRouter.post(
  '/correspondence/:id/send-email',
  (req: Request, res: Response) => {
    const db = getDb();
    const currentUser = getCurrentUser();
    const item = db.correspondence.find((c) => c.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Correspondence not found' });
    }

    const {
      to,
      cc,
      subject,
      body,
      isDraft = false,
      draftId,
      draftUrl,
      provider = 'gmail',
      senderAccount,
    } = req.body;

    if (!to || (Array.isArray(to) && to.length === 0)) {
      return res.status(400).json({ error: 'Recipient email is required.' });
    }

    const sentTo = Array.isArray(to) ? to : [to];
    const sentCc = Array.isArray(cc) ? cc : cc ? [cc] : [];
    const now = new Date().toISOString();

    if (isDraft) {
      item.emailStatus = 'drafted';
      item.emailProvider = provider;
      item.emailDraftId = draftId || item.emailDraftId;
      item.emailDraftUrl = draftUrl || item.emailDraftUrl;
      item.emailDraftCreatedAt = now;
      item.emailSenderAccount = senderAccount || item.emailSenderAccount;

      // Add to history
      if (!item.history) item.history = [];
      item.history.push({
        id: `hist-${Date.now()}`,
        timestamp: now,
        type: 'response_drafted',
        title: `Saved to ${provider === 'gmail' ? 'Gmail' : 'Yahoo'} Drafts`,
        description: `Letter draft prepared for ${sentTo.join(', ')}. Scheduled for end-of-day dispatch check.`,
        actorId: currentUser.id,
        actorName: currentUser.name,
      });

      saveDatabase();

      recordAuditLog({
        correspondenceId: item.id,
        action: 'EMAIL_DRAFTED',
        newValue: `Drafted in ${provider.toUpperCase()}: To ${sentTo.join(', ')}`,
        performedByUserId: currentUser.id,
        performedByUserName: currentUser.name,
        reason: `Saved to ${provider} drafts. End-of-day reminder scheduled.`,
      });

      return res.json({
        success: true,
        message: `Saved as draft in ${provider === 'gmail' ? 'Gmail' : 'Yahoo'}.`,
        item,
      });
    }

    // Direct Sending
    const sendDate = new Date().toISOString().split('T')[0];
    item.status = 'sent';
    item.sentAt = now;
    item.officialDate = sendDate;
    item.dateSent = sendDate;
    item.sentVia = 'email';
    item.emailStatus = 'sent';
    item.emailProvider = provider;
    item.emailSentAt = now;
    item.emailSenderAccount = senderAccount || item.emailSenderAccount;
    item.emailDeliveryRecord = {
      sentTo,
      sentCc,
      sentSubject: subject || item.subject,
      sentBody: body || '',
      timestamp: now,
    };

    // Add to history
    if (!item.history) item.history = [];
    item.history.push({
      id: `hist-${Date.now()}`,
      timestamp: now,
      type: 'dispatched_externally',
      title: `Dispatched via ${provider === 'gmail' ? 'Gmail' : 'Email'}`,
      description: `Official letter dispatched to ${sentTo.join(', ')} from ${senderAccount || 'user mailbox'}.`,
      actorId: currentUser.id,
      actorName: currentUser.name,
    });

    saveDatabase();

    recordAuditLog({
      correspondenceId: item.id,
      action: 'EMAIL_DISPATCHED',
      newValue: `Delivered via ${provider.toUpperCase()} to: ${sentTo.join(', ')}`,
      performedByUserId: currentUser.id,
      performedByUserName: currentUser.name,
      reason: `Dispatched official correspondence with user permission`,
    });

    res.json({
      success: true,
      message: `Official correspondence dispatched to ${sentTo.join(', ')}`,
      emailRecord: item.emailDeliveryRecord,
      item,
    });
  }
);

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const db = getDb();
  const { correspondenceId } = req.query;
  let logs = db.auditLogs;

  if (correspondenceId) {
    logs = logs.filter((l) => l.correspondenceId === correspondenceId);
  }

  res.json(logs);
});

// -------------------------------------------------------------
// SETTINGS & CONFIGURATION
// -------------------------------------------------------------
apiRouter.get('/settings', (req: Request, res: Response) => {
  const db = getDb();
  res.json({
    companySettings: db.companySettings,
    numberSequences: db.numberSequences,
    templates: db.templates,
    departments: db.departments,
    users: db.users,
    archiveFolders: db.archiveFolders || [],
  });
});

// -------------------------------------------------------------
// ARCHIVE FOLDERS & CATEGORIZATION
// -------------------------------------------------------------
apiRouter.get('/archive-folders', (req: Request, res: Response) => {
  const db = getDb();
  res.json(db.archiveFolders || []);
});

apiRouter.post('/archive-folders', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const { name, description, color, isGlobal } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  const cleanName = name.trim();
  db.archiveFolders = db.archiveFolders || [];

  // Check if folder name already exists
  const exists = db.archiveFolders.find(
    (f) => f.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (exists) {
    return res.status(400).json({ error: `An archive folder named "${cleanName}" already exists.` });
  }

  const newFolder: ArchiveFolder = {
    id: `fld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    description: description ? description.trim() : '',
    color: color || 'blue',
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    isGlobal: isGlobal !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    correspondenceIds: [],
  };

  db.archiveFolders.push(newFolder);
  saveDatabase();

  recordAuditLog({
    action: 'ARCHIVE_FOLDER_CREATED',
    newValue: `Created archive folder "${newFolder.name}"`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: 'User defined new archive category folder',
  });

  res.status(201).json({ success: true, folder: newFolder });
});

apiRouter.put('/archive-folders/:id', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const folder = (db.archiveFolders || []).find((f) => f.id === req.params.id);

  if (!folder) {
    return res.status(404).json({ error: 'Archive folder not found' });
  }

  const { name, description, color, isGlobal } = req.body;

  if (name && name.trim()) {
    const cleanName = name.trim();
    const duplicate = db.archiveFolders.find(
      (f) => f.id !== folder.id && f.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ error: `Another archive folder named "${cleanName}" already exists.` });
    }
    folder.name = cleanName;
  }

  if (description !== undefined) folder.description = description;
  if (color) folder.color = color;
  if (isGlobal !== undefined) folder.isGlobal = isGlobal;
  folder.updatedAt = new Date().toISOString();

  saveDatabase();

  recordAuditLog({
    action: 'ARCHIVE_FOLDER_UPDATED',
    newValue: `Updated archive folder "${folder.name}"`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
  });

  res.json({ success: true, folder });
});

apiRouter.delete('/archive-folders/:id', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const folderIndex = (db.archiveFolders || []).findIndex((f) => f.id === req.params.id);

  if (folderIndex === -1) {
    return res.status(404).json({ error: 'Archive folder not found' });
  }

  const deleted = db.archiveFolders.splice(folderIndex, 1)[0];

  // Remove this folder assignment from all correspondence
  let affectedLetters = 0;
  for (const c of db.correspondence) {
    if (c.archiveFolderId === deleted.id) {
      c.archiveFolderId = undefined;
      affectedLetters++;
    }
    if (c.archiveFolderIds && c.archiveFolderIds.includes(deleted.id)) {
      c.archiveFolderIds = c.archiveFolderIds.filter((fid) => fid !== deleted.id);
    }
  }

  saveDatabase();

  recordAuditLog({
    action: 'ARCHIVE_FOLDER_DELETED',
    newValue: `Deleted archive folder "${deleted.name}" (${affectedLetters} unassigned)`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
  });

  res.json({ success: true, message: `Folder "${deleted.name}" removed.` });
});

// Bulk assign or unassign correspondence to/from an archive folder
apiRouter.post('/archive-folders/:id/assign', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const folder = (db.archiveFolders || []).find((f) => f.id === req.params.id);

  if (!folder) {
    return res.status(404).json({ error: 'Archive folder not found' });
  }

  const { correspondenceIds, action = 'add' } = req.body;

  if (!Array.isArray(correspondenceIds) || correspondenceIds.length === 0) {
    return res.status(400).json({ error: 'correspondenceIds array is required' });
  }

  folder.correspondenceIds = folder.correspondenceIds || [];
  let updatedCount = 0;

  for (const cid of correspondenceIds) {
    const item = db.correspondence.find((c) => c.id === cid);
    if (!item) continue;

    if (action === 'add' || action === 'set') {
      // Remove from any prior folder if setting exclusive
      if (item.archiveFolderId && item.archiveFolderId !== folder.id) {
        const prior = db.archiveFolders.find((f) => f.id === item.archiveFolderId);
        if (prior && prior.correspondenceIds) {
          prior.correspondenceIds = prior.correspondenceIds.filter((id) => id !== item.id);
        }
      }

      item.archiveFolderId = folder.id;
      item.isArchived = true;
      if (!item.archivedAt) item.archivedAt = new Date().toISOString();

      if (!folder.correspondenceIds.includes(item.id)) {
        folder.correspondenceIds.push(item.id);
      }
      updatedCount++;
    } else if (action === 'remove') {
      if (item.archiveFolderId === folder.id) {
        item.archiveFolderId = undefined;
      }
      folder.correspondenceIds = folder.correspondenceIds.filter((id) => id !== item.id);
      updatedCount++;
    }
  }

  saveDatabase();

  recordAuditLog({
    action: 'ARCHIVE_ASSIGNMENT',
    newValue: `${action === 'remove' ? 'Removed' : 'Assigned'} ${updatedCount} letters ${action === 'remove' ? 'from' : 'to'} folder "${folder.name}"`,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
  });

  res.json({ success: true, updatedCount, folder });
});

// Single correspondence archive status toggle & folder assignment
apiRouter.post('/correspondence/:id/archive', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const item = db.correspondence.find((c) => c.id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Correspondence not found' });
  }

  const { isArchived, folderId, archiveNotes } = req.body;

  const prevArchived = item.isArchived;
  const prevFolderId = item.archiveFolderId;

  item.isArchived = isArchived !== undefined ? !!isArchived : true;
  if (item.isArchived && !item.archivedAt) {
    item.archivedAt = new Date().toISOString();
  }
  if (!item.isArchived) {
    item.archivedAt = undefined;
  }

  if (archiveNotes !== undefined) {
    item.archiveNotes = archiveNotes;
  }

  if (folderId !== undefined) {
    // Unassign old folder
    if (prevFolderId && prevFolderId !== folderId && db.archiveFolders) {
      const oldFld = db.archiveFolders.find((f) => f.id === prevFolderId);
      if (oldFld && oldFld.correspondenceIds) {
        oldFld.correspondenceIds = oldFld.correspondenceIds.filter((id) => id !== item.id);
      }
    }

    item.archiveFolderId = folderId || undefined;

    // Assign new folder
    if (folderId && db.archiveFolders) {
      const targetFld = db.archiveFolders.find((f) => f.id === folderId);
      if (targetFld) {
        targetFld.correspondenceIds = targetFld.correspondenceIds || [];
        if (!targetFld.correspondenceIds.includes(item.id)) {
          targetFld.correspondenceIds.push(item.id);
        }
      }
    }
  }

  item.lastModifiedDateTime = new Date().toISOString();

  // Add history event
  item.history = item.history || [];
  item.history.unshift({
    id: `hist-arch-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: item.isArchived ? 'status_transition' : 'status_transition',
    title: item.isArchived ? 'Archived' : 'Unarchived',
    description: item.isArchived
      ? `Archived into ${folderId ? (db.archiveFolders?.find((f) => f.id === folderId)?.name || 'folder') : 'General Archive'}`
      : 'Restored from archive',
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
  });

  saveDatabase();

  recordAuditLog({
    correspondenceId: item.id,
    action: item.isArchived ? 'CORRESPONDENCE_ARCHIVED' : 'CORRESPONDENCE_UNARCHIVED',
    newValue: item.isArchived ? `Archived (Folder: ${item.archiveFolderId || 'None'})` : 'Restored to active registry',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: archiveNotes || 'User archive status update',
  });

  res.json({ success: true, correspondence: item });
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();

  if (currentUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Permission Denied: Only Administrators can modify organization configuration.',
    });
  }

  const { companySettings, numberSequences, templates } = req.body;

  if (companySettings) {
    db.companySettings = { ...db.companySettings, ...companySettings };
  }

  if (numberSequences) {
    if (numberSequences.incoming) {
      db.numberSequences.incoming = {
        ...db.numberSequences.incoming,
        ...numberSequences.incoming,
      };
    }
    if (numberSequences.outgoing) {
      db.numberSequences.outgoing = {
        ...db.numberSequences.outgoing,
        ...numberSequences.outgoing,
      };
    }
  }

  if (templates && Array.isArray(templates)) {
    db.templates = templates;
  }

  saveDatabase();

  recordAuditLog({
    action: 'SETTINGS_CONFIGURED',
    newValue: 'Updated company configuration, letterhead, and numbering sequences',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: 'Administrative configuration save',
  });

  res.json({ success: true, message: 'Settings saved successfully' });
});

// -------------------------------------------------------------
// AI ASSISTANCE ENDPOINTS (Powered by Gemini)
// -------------------------------------------------------------
apiRouter.post('/ai/improve', async (req: Request, res: Response) => {
  const { text, mode } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for AI improvement' });
  }

  try {
    const improved = await improveLetterText(text, mode || 'professional');
    res.json({ result: improved });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI request failed' });
  }
});

apiRouter.post('/ai/draft-response', async (req: Request, res: Response) => {
  const { incomingSubject, incomingBody, externalRef, instructions } =
    req.body;

  try {
    const draft = await draftOfficialResponse(
      incomingSubject || '',
      incomingBody || '',
      externalRef || '',
      instructions || ''
    );
    res.json(draft);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI draft failed' });
  }
});

apiRouter.post('/ai/extract-incoming', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    return res
      .status(400)
      .json({ error: 'Pasted text is required to extract metadata' });
  }

  try {
    const metadata = await extractIncomingMetadata(text);
    res.json(metadata);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI extraction failed' });
  }
});

// -------------------------------------------------------------
// EXECUTIVE DASHBOARD STATS
// -------------------------------------------------------------
apiRouter.get('/dashboard/stats', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM

  const incomingTotal = db.correspondence.filter((c) => c.type === 'incoming');
  const outgoingTotal = db.correspondence.filter((c) => c.type === 'outgoing');

  const incomingToday = incomingTotal.filter(
    (c) => c.officialDate === todayStr
  ).length;
  const outgoingToday = outgoingTotal.filter(
    (c) => c.officialDate === todayStr
  ).length;

  const incomingMonth = incomingTotal.filter((c) =>
    c.officialDate.startsWith(thisMonthStr)
  ).length;
  const outgoingMonth = outgoingTotal.filter((c) =>
    c.officialDate.startsWith(thisMonthStr)
  ).length;

  // Task stats
  const myTasks = db.tasks.filter((t) => t.assignedUserId === currentUser.id);
  const myPendingTasks = myTasks.filter((t) => t.status !== 'completed');

  const allPendingTasks = db.tasks.filter((t) => t.status !== 'completed');
  const dueToday = allPendingTasks.filter((t) => t.dueDate === todayStr).length;
  const overdue = allPendingTasks.filter((t) => t.dueDate < todayStr).length;

  // Workflow stages for outgoing
  const drafts = outgoingTotal.filter((c) => c.status === 'draft').length;
  const underReview = outgoingTotal.filter(
    (c) => c.status === 'under_review'
  ).length;
  const awaitingApproval = outgoingTotal.filter(
    (c) => c.status === 'awaiting_approval'
  ).length;
  const approved = outgoingTotal.filter((c) => c.status === 'approved').length;

  // Recent activity
  const recentLogs = db.auditLogs.slice(0, 8);

  res.json({
    incomingToday,
    outgoingToday,
    incomingMonth,
    outgoingMonth,
    totalIncoming: incomingTotal.length,
    totalOutgoing: outgoingTotal.length,
    myPendingTasksCount: myPendingTasks.length,
    dueToday,
    overdue,
    workflow: {
      drafts,
      underReview,
      awaitingApproval,
      approved,
    },
    recentLogs,
  });
});

// -------------------------------------------------------------
// TECHNICAL & COMMERCIAL DOCUMENTS (ACONEX EDMS)
// -------------------------------------------------------------
apiRouter.post('/documents/clear-all', (req: Request, res: Response) => {
  clearAllTechnicalDocuments();
  res.json({ success: true, message: 'All technical documents cleared from EDMS.' });
});

apiRouter.get('/documents', (req: Request, res: Response) => {
  const db = getDb();
  let docs = db.technicalDocuments || [];

  const { discipline, documentType, projectCode, clientCompany, reviewStatus, search } = req.query;

  if (discipline && discipline !== 'ALL') {
    docs = docs.filter((d) => d.discipline === discipline);
  }
  if (documentType && documentType !== 'ALL') {
    docs = docs.filter((d) => d.documentType === documentType);
  }
  if (projectCode && projectCode !== 'ALL') {
    docs = docs.filter((d) => d.projectCode === projectCode);
  }
  if (clientCompany && clientCompany !== 'ALL') {
    docs = docs.filter((d) => d.clientCompany === clientCompany);
  }
  if (reviewStatus && reviewStatus !== 'ALL') {
    docs = docs.filter((d) => d.reviewStatus === reviewStatus);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    docs = docs.filter(
      (d) =>
        d.documentNumber.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.projectName.toLowerCase().includes(q) ||
        d.clientCompany.toLowerCase().includes(q) ||
        (d.costCode && d.costCode.toLowerCase().includes(q)) ||
        (d.revenueCode && d.revenueCode.toLowerCase().includes(q)) ||
        (d.supplierName && d.supplierName.toLowerCase().includes(q))
    );
  }

  res.json(docs);
});

apiRouter.post('/documents/generate-number', (req: Request, res: Response) => {
  const { projectCode, originator, discipline, documentType } = req.body;
  const result = generateTechnicalDocumentNumber({
    projectCode,
    originator,
    discipline,
    documentType,
  });
  res.json(result);
});

apiRouter.post('/documents', (req: Request, res: Response) => {
  const db = getDb();
  if (!db.technicalDocuments) {
    db.technicalDocuments = [];
  }

  const currentUser = getCurrentUser();
  const data = req.body;

  let docNumber = data.documentNumber;
  let seqNum = data.sequenceNumber || 1;

  if (!docNumber) {
    const generated = generateTechnicalDocumentNumber({
      projectCode: data.projectCode || 'PRJ01',
      originator: data.originator || 'PJMAK',
      discipline: data.discipline || 'TEC',
      documentType: data.documentType || 'PRP',
    });
    docNumber = generated.documentNumber;
    seqNum = generated.sequenceNumber;
  }

  const newDocId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const initialRevision: DocumentRevision = {
    id: `rev-${Date.now()}`,
    revision: data.currentRevision || 'Rev 0',
    issueDate: data.revisionDate || new Date().toISOString().slice(0, 10),
    issuedByUserId: currentUser.id,
    issuedByUserName: currentUser.name,
    reasonForIssue: data.reasonForIssue || 'For Review',
    reviewStatus: data.reviewStatus || 'under_review',
    transmittalLetterNumber: data.transmittalLetterNumber,
    fileName: data.fileName,
    notes: data.notes,
    createdAt: new Date().toISOString(),
  };

  const newDoc: TechnicalDocument = {
    id: newDocId,
    documentNumber: docNumber,
    title: data.title || 'Untitled Technical Document',
    description: data.description || '',
    projectCode: data.projectCode || 'PRJ-2026-01',
    projectName: data.projectName || 'Project 2026',
    clientCompany: data.clientCompany || 'Client Organization',
    clientContactPerson: data.clientContactPerson,
    clientEmail: data.clientEmail,
    discipline: data.discipline || 'TEC',
    documentType: data.documentType || 'PRP',
    originator: data.originator || 'PJMAK',
    sequenceNumber: seqNum,
    currentRevision: data.currentRevision || 'Rev 0',
    revisionDate: data.revisionDate || new Date().toISOString().slice(0, 10),
    reasonForIssue: data.reasonForIssue || 'For Review',
    reviewStatus: data.reviewStatus || 'under_review',
    costCode: data.costCode,
    revenueCode: data.revenueCode,
    commercialValue: data.commercialValue ? Number(data.commercialValue) : undefined,
    currency: data.currency || 'USD',
    proformaInvoiceNumber: data.proformaInvoiceNumber,
    contractNumber: data.contractNumber,
    supplierName: data.supplierName,
    milestoneStage: data.milestoneStage || 'tender_bidding',
    plannedClosingDate: data.plannedClosingDate,
    linkedCorrespondenceIds: data.linkedCorrespondenceIds || [],
    linkedCorrespondenceNumbers: data.linkedCorrespondenceNumbers || [],
    revisions: [initialRevision],
    attachments: data.attachments || [],
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    departmentId: currentUser.departmentId,
    departmentName: currentUser.departmentName,
    confidentiality: data.confidentiality || 'internal',
    tags: data.tags || [],
    documentMode: data.documentMode || 'generated',
    documentScope: data.documentScope || '',
    clientDocumentNumber: data.clientDocumentNumber || '',
    clientRevisionCode: data.clientRevisionCode || '',
    contractorDocumentNumber: data.contractorDocumentNumber || docNumber,
    contractorRevisionNo: data.contractorRevisionNo || '0',
    poNumber: data.poNumber || '',
    rdsPpCode: data.rdsPpCode || '',
    fileFormat: data.fileFormat || (data.documentType === 'DWG' ? 'dwg' : 'docx'),
    bodyHtml: data.bodyHtml || '',
    holdPoints: data.holdPoints || [],
    revisionHistoryItems: data.revisionHistoryItems || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.technicalDocuments.unshift(newDoc);

  recordAuditLog({
    correspondenceId: newDoc.id,
    correspondenceNumber: newDoc.documentNumber,
    action: 'REGISTER_TECHNICAL_DOCUMENT',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: `Registered document ${newDoc.documentNumber}: ${newDoc.title}`,
  });

  saveDatabase();
  res.status(201).json(newDoc);
});

apiRouter.get('/documents/:id', (req: Request, res: Response) => {
  const db = getDb();
  const doc = (db.technicalDocuments || []).find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(doc);
});

apiRouter.put('/documents/:id', (req: Request, res: Response) => {
  const db = getDb();
  const index = (db.technicalDocuments || []).findIndex((d) => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const currentUser = getCurrentUser();
  const existing = db.technicalDocuments[index];
  const updated: TechnicalDocument = {
    ...existing,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  db.technicalDocuments[index] = updated;

  recordAuditLog({
    correspondenceId: updated.id,
    correspondenceNumber: updated.documentNumber,
    action: 'UPDATE_TECHNICAL_DOCUMENT',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: `Updated document metadata for ${updated.documentNumber}`,
  });

  saveDatabase();
  res.json(updated);
});

apiRouter.post('/documents/:id/revisions', (req: Request, res: Response) => {
  const db = getDb();
  const index = (db.technicalDocuments || []).findIndex((d) => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const currentUser = getCurrentUser();
  const doc = db.technicalDocuments[index];
  const revData = req.body;

  const newRevision: DocumentRevision = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    revision: revData.revision || `Rev ${doc.revisions.length}`,
    issueDate: revData.issueDate || new Date().toISOString().slice(0, 10),
    issuedByUserId: currentUser.id,
    issuedByUserName: currentUser.name,
    reasonForIssue: revData.reasonForIssue || 'For Review',
    reviewStatus: revData.reviewStatus || 'under_review',
    transmittalLetterNumber: revData.transmittalLetterNumber,
    fileName: revData.fileName,
    fileSize: revData.fileSize,
    fileUrl: revData.fileUrl,
    notes: revData.notes,
    signOff: revData.signOff,
    createdAt: new Date().toISOString(),
  };

  doc.revisions.unshift(newRevision);
  doc.currentRevision = newRevision.revision;
  doc.revisionDate = newRevision.issueDate;
  doc.reasonForIssue = newRevision.reasonForIssue;
  doc.reviewStatus = newRevision.reviewStatus;
  doc.updatedAt = new Date().toISOString();

  if (revData.transmittalLetterNumber && !doc.linkedCorrespondenceNumbers.includes(revData.transmittalLetterNumber)) {
    doc.linkedCorrespondenceNumbers.push(revData.transmittalLetterNumber);
  }

  recordAuditLog({
    correspondenceId: doc.id,
    correspondenceNumber: doc.documentNumber,
    action: 'NEW_DOCUMENT_REVISION',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: `Issued revision ${newRevision.revision} for ${doc.documentNumber}`,
  });

  saveDatabase();
  res.json(doc);
});

apiRouter.delete('/documents/:id', (req: Request, res: Response) => {
  const db = getDb();
  const index = (db.technicalDocuments || []).findIndex((d) => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const currentUser = getCurrentUser();
  const [removed] = db.technicalDocuments.splice(index, 1);

  recordAuditLog({
    correspondenceId: removed.id,
    correspondenceNumber: removed.documentNumber,
    action: 'DELETE_TECHNICAL_DOCUMENT',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: `Deleted document ${removed.documentNumber}: ${removed.title}`,
  });

  saveDatabase();
  res.json({ success: true, removedId: removed.id });
});

// -------------------------------------------------------------
// EMAIL TRANSMITTAL TEMPLATES
// -------------------------------------------------------------
apiRouter.get('/email-templates', (req: Request, res: Response) => {
  const db = getDb();
  res.json(db.emailTemplates || []);
});

apiRouter.post('/email-templates', (req: Request, res: Response) => {
  const db = getDb();
  if (!db.emailTemplates) {
    db.emailTemplates = [];
  }
  const tpl = req.body;
  const newTpl: EmailTemplateItem = {
    id: tpl.id || `tpl-${Date.now()}`,
    name: tpl.name || 'Custom Transmittal Template',
    description: tpl.description || '',
    category: tpl.category || 'general',
    defaultSalutation: tpl.defaultSalutation || 'Dear Mr.',
    subjectFormat: tpl.subjectFormat || '{subject} - {letterNumber}',
    bodyFormat: tpl.bodyFormat || '',
    isSystem: false,
  };
  db.emailTemplates.push(newTpl);
  saveDatabase();
  res.status(201).json(newTpl);
});

// -------------------------------------------------------------
// CONTROLLED EXTERNAL DOCUMENT ACCESS & REVIEW EXTENSION
// -------------------------------------------------------------

function recordExternalAuditLog(params: {
  shareId?: string;
  documentId?: string;
  documentNumber?: string;
  revision?: string;
  externalUserId?: string;
  externalUserName?: string;
  externalUserCompany?: string;
  performedByUserId?: string;
  performedByUserName?: string;
  actorType: 'internal' | 'external' | 'system';
  eventType: ExternalAuditEventType;
  result: 'allowed' | 'denied' | 'success' | 'failed' | 'info';
  details: string;
  metadata?: Record<string, any>;
}): ExternalAccessAuditLog {
  const db = getDb();
  if (!db.externalAuditLogs) {
    db.externalAuditLogs = [];
  }
  const log: ExternalAccessAuditLog = {
    id: `ext-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    shareId: params.shareId,
    documentId: params.documentId,
    documentNumber: params.documentNumber,
    revision: params.revision,
    externalUserId: params.externalUserId,
    externalUserName: params.externalUserName,
    externalUserCompany: params.externalUserCompany,
    performedByUserId: params.performedByUserId,
    performedByUserName: params.performedByUserName,
    actorType: params.actorType,
    eventType: params.eventType,
    timestamp: new Date().toISOString(),
    result: params.result,
    details: params.details,
    metadata: params.metadata,
  };
  db.externalAuditLogs.unshift(log);
  return log;
}

// 1. External User Authentication
apiRouter.post('/external/auth/login', (req: Request, res: Response) => {
  const { identifier, password, shareToken } = req.body;
  const db = getDb();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const extUser = (db.externalUsers || []).find(
    (u) => (u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId)
  );

  if (!extUser) {
    recordExternalAuditLog({
      actorType: 'external',
      eventType: 'failed_login',
      result: 'denied',
      details: `Failed external login attempt for identifier: ${identifier} (user not found)`,
    });
    saveDatabase();
    return res.status(401).json({ error: 'Invalid external credentials or account not registered.' });
  }

  if (extUser.status === 'revoked' || extUser.status === 'suspended') {
    recordExternalAuditLog({
      externalUserId: extUser.id,
      externalUserName: extUser.name,
      externalUserCompany: extUser.company,
      actorType: 'external',
      eventType: 'failed_login',
      result: 'denied',
      details: `Login denied: external account is ${extUser.status}`,
    });
    saveDatabase();
    return res.status(403).json({ error: `Your external account has been ${extUser.status}. Please contact PJMAK Administration.` });
  }

  // Password verification
  if (extUser.password && extUser.password !== password) {
    recordExternalAuditLog({
      externalUserId: extUser.id,
      externalUserName: extUser.name,
      externalUserCompany: extUser.company,
      actorType: 'external',
      eventType: 'failed_login',
      result: 'denied',
      details: `Failed external login attempt for ${extUser.username} (incorrect password)`,
    });
    saveDatabase();
    return res.status(401).json({ error: 'Incorrect credentials provided.' });
  }

  // Update last login
  extUser.lastLoginAt = new Date().toISOString();

  // Find authorized shares for this external user
  const shares = (db.documentShares || []).filter(
    (s) => s.externalUserId === extUser.id && s.status !== 'revoked'
  );

  recordExternalAuditLog({
    externalUserId: extUser.id,
    externalUserName: extUser.name,
    externalUserCompany: extUser.company,
    actorType: 'external',
    eventType: 'login',
    result: 'allowed',
    details: `External user ${extUser.name} (${extUser.company}) logged in successfully`,
  });

  saveDatabase();

  res.json({
    user: {
      id: extUser.id,
      name: extUser.name,
      company: extUser.company,
      email: extUser.email,
      username: extUser.username,
      status: extUser.status,
      lastLoginAt: extUser.lastLoginAt,
    },
    authorizedShares: shares,
  });
});

// 2. Public Share Lookup by Token (before or during login)
apiRouter.get('/external/shares/:token', (req: Request, res: Response) => {
  const db = getDb();
  const token = req.params.token;
  const share = (db.documentShares || []).find((s) => s.shareToken === token);

  if (!share) {
    return res.status(404).json({ error: 'Document share invitation not found or link has expired.' });
  }

  const extUser = (db.externalUsers || []).find((u) => u.id === share.externalUserId);
  const evaluation = evaluateAccessSchedule(share, extUser);

  res.json({
    share: {
      id: share.id,
      shareToken: share.shareToken,
      documentNumber: share.documentNumber,
      documentTitle: share.documentTitle,
      selectedRevision: share.selectedRevision,
      recipientName: share.recipientName,
      recipientCompany: share.recipientCompany,
      recipientUsername: share.recipientUsername,
      recipientEmail: share.recipientEmail,
      schedule: share.schedule,
      permissions: share.permissions,
      status: share.status,
      watermarkConfig: share.watermarkConfig,
      hasExtensionPending: share.extensionRequests?.some((e) => e.status === 'pending'),
    },
    evaluation,
  });
});

// 3. Controlled Document Access by Share ID (Server-Side Authorization & Schedule Enforcement)
apiRouter.get('/external/documents/:shareId', (req: Request, res: Response) => {
  const db = getDb();
  const shareId = req.params.shareId;
  const share = (db.documentShares || []).find((s) => s.id === shareId);

  if (!share) {
    return res.status(404).json({ error: 'Document share not found.' });
  }

  const extUser = (db.externalUsers || []).find((u) => u.id === share.externalUserId);
  const evaluation = evaluateAccessSchedule(share, extUser);

  // If revoked, expired, or outside working hours: evaluate and block if not allowed
  if (!evaluation.allowed) {
    recordExternalAuditLog({
      shareId: share.id,
      documentId: share.documentId,
      documentNumber: share.documentNumber,
      revision: share.selectedRevision,
      externalUserId: share.externalUserId,
      externalUserName: share.recipientName,
      externalUserCompany: share.recipientCompany,
      actorType: 'external',
      eventType: evaluation.status === 'revoked' ? 'access_revoked' : evaluation.status === 'expired' ? 'access_expired' : 'document_opened',
      result: 'denied',
      details: `Access rejected: ${evaluation.reason}`,
    });
    saveDatabase();

    return res.status(403).json({
      error: evaluation.reason,
      status: evaluation.status,
      evaluation,
      share: {
        id: share.id,
        documentNumber: share.documentNumber,
        documentTitle: share.documentTitle,
        recipientName: share.recipientName,
        recipientCompany: share.recipientCompany,
        schedule: share.schedule,
        permissions: share.permissions,
        status: share.status,
        hasExtensionPending: share.extensionRequests?.some((e) => e.status === 'pending'),
        extensionRequests: share.extensionRequests || [],
      },
    });
  }

  // Find document
  const doc = (db.technicalDocuments || []).find((d) => d.id === share.documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Original technical document not found in EDMS.' });
  }

  // Filter revisions according to permissions
  let availableRevisions = doc.revisions;
  if (!share.permissions.allowLaterRevisions) {
    availableRevisions = doc.revisions.filter((r) => r.revision === share.selectedRevision);
    if (availableRevisions.length === 0 && doc.revisions.length > 0) {
      availableRevisions = [doc.revisions[0]];
    }
  }

  // Fetch comments for this document
  const comments = (db.documentComments || []).filter((c) => c.documentId === doc.id);

  // Update last access timestamp
  share.lastAccessAt = new Date().toISOString();

  // Record audit log
  recordExternalAuditLog({
    shareId: share.id,
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    revision: share.selectedRevision,
    externalUserId: share.externalUserId,
    externalUserName: share.recipientName,
    externalUserCompany: share.recipientCompany,
    actorType: 'external',
    eventType: 'document_viewed',
    result: 'allowed',
    details: `Controlled Document Viewer rendered for ${doc.documentNumber} (${share.selectedRevision}) with dynamic watermark`,
  });

  saveDatabase();

  res.json({
    document: {
      id: doc.id,
      documentNumber: doc.documentNumber,
      title: doc.title,
      description: doc.description,
      projectCode: doc.projectCode,
      projectName: doc.projectName,
      clientCompany: doc.clientCompany,
      discipline: doc.discipline,
      documentType: doc.documentType,
      currentRevision: doc.currentRevision,
      revisionDate: doc.revisionDate,
      reasonForIssue: doc.reasonForIssue,
      reviewStatus: doc.reviewStatus,
      revisions: availableRevisions,
      attachments: doc.attachments || [],
    },
    share: {
      id: share.id,
      shareToken: share.shareToken,
      selectedRevision: share.selectedRevision,
      recipientName: share.recipientName,
      recipientCompany: share.recipientCompany,
      recipientUsername: share.recipientUsername,
      schedule: share.schedule,
      permissions: share.permissions,
      status: share.status,
      watermarkConfig: share.watermarkConfig,
      extensionRequests: share.extensionRequests || [],
      lastAccessAt: share.lastAccessAt,
    },
    comments,
    evaluation,
  });
});

// 4. External Review Comments: GET / POST
apiRouter.get('/external/documents/:shareId/comments', (req: Request, res: Response) => {
  const db = getDb();
  const shareId = req.params.shareId;
  const share = (db.documentShares || []).find((s) => s.id === shareId);

  if (!share) {
    return res.status(404).json({ error: 'Document share not found' });
  }

  const comments = (db.documentComments || []).filter((c) => c.documentId === share.documentId);
  res.json(comments);
});

apiRouter.post('/external/documents/:shareId/comments', (req: Request, res: Response) => {
  const db = getDb();
  const shareId = req.params.shareId;
  const share = (db.documentShares || []).find((s) => s.id === shareId);

  if (!share) {
    return res.status(404).json({ error: 'Document share not found' });
  }

  const extUser = (db.externalUsers || []).find((u) => u.id === share.externalUserId);
  const evaluation = evaluateAccessSchedule(share, extUser);

  if (!evaluation.allowed) {
    return res.status(403).json({ error: `Cannot submit comments: ${evaluation.reason}` });
  }

  if (!share.permissions.canComment) {
    return res.status(403).json({ error: 'Comment permission has been disabled for this document access.' });
  }

  const { revision, pageNumber, locationAnnotation, commentText, authorName, authorCompany } = req.body;

  if (!commentText || !commentText.trim()) {
    return res.status(400).json({ error: 'Comment text cannot be blank.' });
  }

  const newComment: DocumentComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    shareId: share.id,
    documentId: share.documentId,
    documentNumber: share.documentNumber,
    revision: revision || share.selectedRevision,
    pageNumber: pageNumber ? Number(pageNumber) : undefined,
    locationAnnotation: locationAnnotation || '',
    commentText: commentText.trim(),
    authorId: share.externalUserId,
    authorName: authorName || share.recipientName,
    authorCompany: authorCompany || share.recipientCompany,
    authorRole: 'external',
    createdAt: new Date().toISOString(),
    status: 'open',
    replies: [],
  };

  if (!db.documentComments) db.documentComments = [];
  db.documentComments.push(newComment);

  recordExternalAuditLog({
    shareId: share.id,
    documentId: share.documentId,
    documentNumber: share.documentNumber,
    revision: newComment.revision,
    externalUserId: share.externalUserId,
    externalUserName: share.recipientName,
    externalUserCompany: share.recipientCompany,
    actorType: 'external',
    eventType: 'comment_created',
    result: 'success',
    details: `Added review comment on ${newComment.revision}${newComment.pageNumber ? ` (Page ${newComment.pageNumber})` : ''}: "${newComment.commentText.slice(0, 60)}..."`,
  });

  saveDatabase();
  res.status(201).json(newComment);
});

// Reply to a comment (by external or internal user)
apiRouter.post('/external/comments/:commentId/reply', (req: Request, res: Response) => {
  const db = getDb();
  const comment = (db.documentComments || []).find((c) => c.id === req.params.commentId);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const { text, authorName, authorRole, authorCompany } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Reply text cannot be empty' });
  }

  const reply: CommentReply = {
    id: `rpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    commentId: comment.id,
    authorId: authorRole === 'internal' ? getCurrentUser().id : (comment.authorId || 'external-reviewer'),
    authorName: authorName || (authorRole === 'internal' ? getCurrentUser().name : 'External Reviewer'),
    authorRole: authorRole || 'internal',
    authorCompany: authorCompany || (authorRole === 'internal' ? 'PJMAK Engineering' : undefined),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  if (!comment.replies) comment.replies = [];
  comment.replies.push(reply);

  // Update comment status to in_discussion if currently open
  if (comment.status === 'open' && authorRole === 'internal') {
    comment.status = 'in_discussion';
  }

  recordExternalAuditLog({
    shareId: comment.shareId,
    documentId: comment.documentId,
    documentNumber: comment.documentNumber,
    revision: comment.revision,
    actorType: authorRole || 'internal',
    eventType: 'comment_replied',
    result: 'success',
    details: `Replied to comment ${comment.id}: "${reply.text.slice(0, 50)}..."`,
  });

  saveDatabase();
  res.json(comment);
});

// 5. External Extension Request
apiRouter.post('/external/documents/:shareId/extension-request', (req: Request, res: Response) => {
  const db = getDb();
  const share = (db.documentShares || []).find((s) => s.id === req.params.shareId);

  if (!share) {
    return res.status(404).json({ error: 'Document share not found' });
  }

  if (!share.permissions.canRequestExtension) {
    return res.status(403).json({ error: 'Extension requests are disabled for this document access.' });
  }

  const { requestedWorkingDays, requestedExpiryDate, requestedExpiryTime, reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Please provide a clear reason for requesting an extension.' });
  }

  const extRequest: ExtensionRequest = {
    id: `ext-req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    shareId: share.id,
    requestedAt: new Date().toISOString(),
    requestedByUserName: share.recipientName,
    requestedWorkingDays: requestedWorkingDays ? Number(requestedWorkingDays) : undefined,
    requestedExpiryDate: requestedExpiryDate || undefined,
    requestedExpiryTime: requestedExpiryTime || '17:00',
    reason: reason.trim(),
    status: 'pending',
  };

  if (!share.extensionRequests) share.extensionRequests = [];
  share.extensionRequests.unshift(extRequest);
  share.status = 'extension_requested';

  recordExternalAuditLog({
    shareId: share.id,
    documentId: share.documentId,
    documentNumber: share.documentNumber,
    revision: share.selectedRevision,
    externalUserId: share.externalUserId,
    externalUserName: share.recipientName,
    externalUserCompany: share.recipientCompany,
    actorType: 'external',
    eventType: 'extension_requested',
    result: 'success',
    details: `Requested access extension: ${requestedWorkingDays ? `+${requestedWorkingDays} working days` : requestedExpiryDate}. Reason: "${reason.trim()}"`,
  });

  saveDatabase();
  res.json({ share, extensionRequest: extRequest });
});

// 6. INTERNAL ADMINISTRATOR: GET / POST Document Shares
apiRouter.get('/external-shares', (req: Request, res: Response) => {
  const db = getDb();
  const shares = db.documentShares || [];
  const comments = db.documentComments || [];

  // Enrich shares with live evaluated status, comment counts, and pending request status
  const enriched = shares.map((s) => {
    const extUser = (db.externalUsers || []).find((u) => u.id === s.externalUserId);
    const evaluation = evaluateAccessSchedule(s, extUser);
    const docComments = comments.filter((c) => c.documentId === s.documentId);
    const pendingExtension = s.extensionRequests?.find((e) => e.status === 'pending');

    return {
      ...s,
      liveStatus: evaluation.status,
      isCurrentlyAccessible: evaluation.allowed,
      evaluationReason: evaluation.reason,
      nextActiveTime: evaluation.nextActiveTime,
      totalComments: docComments.length,
      openComments: docComments.filter((c) => c.status === 'open' || c.status === 'in_discussion').length,
      pendingExtension,
    };
  });

  res.json(enriched);
});

apiRouter.post('/external-shares', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const {
    documentId,
    selectedRevision,
    recipientName,
    recipientCompany,
    recipientEmail,
    recipientUsername,
    recipientPassword,
    startDate,
    startTime,
    expiryDate,
    expiryTime,
    workingDays,
    dailyStartTime,
    dailyEndTime,
    timeZone,
    publicHolidays,
    canView,
    canComment,
    canDownload,
    canPrint,
    canCopy,
    canRequestExtension,
    allowLaterRevisions,
    watermarkCustomText,
  } = req.body;

  if (!documentId) {
    return res.status(400).json({ error: 'Please select a document to share.' });
  }

  const doc = (db.technicalDocuments || []).find((d) => d.id === documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Selected document does not exist in EDMS.' });
  }

  if (!recipientName || !recipientEmail) {
    return res.status(400).json({ error: 'Recipient Name and Email are required.' });
  }

  // Find or create external user
  if (!db.externalUsers) db.externalUsers = [];
  let extUser = db.externalUsers.find(
    (u) => u.email.toLowerCase() === recipientEmail.trim().toLowerCase()
  );

  const cleanUsername = (recipientUsername || recipientEmail.split('@')[0] || `user.${Date.now()}`).trim();
  const defaultPassword = recipientPassword || `PjmakReview${new Date().getFullYear()}!`;

  if (!extUser) {
    extUser = {
      id: `ext-usr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: recipientName.trim(),
      company: (recipientCompany || 'External Organization').trim(),
      email: recipientEmail.trim(),
      username: cleanUsername,
      password: defaultPassword,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    db.externalUsers.push(extUser);
  } else {
    // Update company / name / password if provided
    extUser.name = recipientName.trim();
    if (recipientCompany) extUser.company = recipientCompany.trim();
    if (recipientPassword) extUser.password = recipientPassword;
  }

  // Generate unique secure token
  const shareToken = `sec-${crypto.randomBytes(12).toString('hex')}`;

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const newShare: DocumentShare = {
    id: `share-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    shareToken,
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    documentTitle: doc.title,
    selectedRevision: selectedRevision || doc.currentRevision || 'Rev 0',
    externalUserId: extUser.id,
    recipientName: extUser.name,
    recipientCompany: extUser.company,
    recipientEmail: extUser.email,
    recipientUsername: extUser.username,
    schedule: {
      startDate: startDate || todayStr,
      startTime: startTime || '08:30',
      expiryDate: expiryDate || nextWeek,
      expiryTime: expiryTime || '17:30',
      workingDays: workingDays && workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5],
      dailyStartTime: dailyStartTime || '08:30',
      dailyEndTime: dailyEndTime || '17:30',
      timeZone: timeZone || 'Europe/Amsterdam',
      publicHolidays: publicHolidays || [],
    },
    permissions: {
      canView: canView !== false,
      canComment: canComment !== false,
      canDownload: Boolean(canDownload),
      canPrint: Boolean(canPrint),
      canCopy: Boolean(canCopy),
      canRequestExtension: canRequestExtension !== false,
      allowLaterRevisions: Boolean(allowLaterRevisions),
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    watermarkConfig: {
      enabled: true,
      customText: watermarkCustomText || 'CONFIDENTIAL & PROPRIETARY • CONTROLLED COPY',
    },
    extensionRequests: [],
  };

  if (!db.documentShares) db.documentShares = [];
  db.documentShares.unshift(newShare);

  // Record audit logs
  recordExternalAuditLog({
    shareId: newShare.id,
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    revision: newShare.selectedRevision,
    externalUserId: extUser.id,
    externalUserName: extUser.name,
    externalUserCompany: extUser.company,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    actorType: 'internal',
    eventType: 'invitation_created',
    result: 'success',
    details: `Created controlled share for ${doc.documentNumber} (${newShare.selectedRevision}) with recipient ${extUser.name} (${extUser.company})`,
  });

  recordExternalAuditLog({
    shareId: newShare.id,
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    revision: newShare.selectedRevision,
    externalUserId: extUser.id,
    externalUserName: extUser.name,
    externalUserCompany: extUser.company,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    actorType: 'internal',
    eventType: 'invitation_sent',
    result: 'success',
    details: `Generated access token link for ${extUser.email}`,
  });

  saveDatabase();

  res.status(201).json({
    share: newShare,
    externalUser: {
      id: extUser.id,
      name: extUser.name,
      username: extUser.username,
      email: extUser.email,
      password: extUser.password,
    },
    credentials: {
      username: extUser.username,
      password: extUser.password,
    },
    accessUrl: `/?ext_share=${shareToken}`,
  });
});

// 7. Update Share Schedule & Permissions
apiRouter.put('/external-shares/:id', (req: Request, res: Response) => {
  const db = getDb();
  const share = (db.documentShares || []).find((s) => s.id === req.params.id);

  if (!share) {
    return res.status(404).json({ error: 'Document share not found' });
  }

  const currentUser = getCurrentUser();
  const { schedule, permissions, watermarkConfig, status } = req.body;

  if (schedule) {
    share.schedule = {
      ...share.schedule,
      ...schedule,
    };
  }

  if (permissions) {
    share.permissions = {
      ...share.permissions,
      ...permissions,
    };
  }

  if (watermarkConfig) {
    share.watermarkConfig = {
      ...share.watermarkConfig,
      ...watermarkConfig,
    };
  }

  if (status && ['active', 'suspended', 'revoked'].includes(status)) {
    share.status = status;
  }

  recordExternalAuditLog({
    shareId: share.id,
    documentId: share.documentId,
    documentNumber: share.documentNumber,
    revision: share.selectedRevision,
    externalUserId: share.externalUserId,
    externalUserName: share.recipientName,
    externalUserCompany: share.recipientCompany,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    actorType: 'internal',
    eventType: 'permission_changed',
    result: 'success',
    details: `Updated schedule / permissions by ${currentUser.name}`,
  });

  saveDatabase();
  res.json(share);
});

// 8. Revoke External Share Immediately
apiRouter.post('/external-shares/:id/revoke', (req: Request, res: Response) => {
  const db = getDb();
  const share = (db.documentShares || []).find((s) => s.id === req.params.id);

  if (!share) {
    return res.status(404).json({ error: 'Document share not found' });
  }

  const currentUser = getCurrentUser();
  const { reason } = req.body;

  share.status = 'revoked';
  share.revokedAt = new Date().toISOString();
  share.revokedByUserId = currentUser.id;
  share.revokedByUserName = currentUser.name;
  share.revocationReason = reason || 'Revoked by PJMAK administrator';

  recordExternalAuditLog({
    shareId: share.id,
    documentId: share.documentId,
    documentNumber: share.documentNumber,
    revision: share.selectedRevision,
    externalUserId: share.externalUserId,
    externalUserName: share.recipientName,
    externalUserCompany: share.recipientCompany,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    actorType: 'internal',
    eventType: 'access_revoked',
    result: 'denied',
    details: `Access revoked immediately by ${currentUser.name}. Reason: ${share.revocationReason}`,
  });

  saveDatabase();
  res.json({ success: true, share });
});

// 9. Review Extension Request (Approve / Reject / Custom Duration)
apiRouter.post('/external-shares/:id/extension/:extId/review', (req: Request, res: Response) => {
  const db = getDb();
  const share = (db.documentShares || []).find((s) => s.id === req.params.id);

  if (!share) {
    return res.status(404).json({ error: 'Document share not found' });
  }

  const ext = (share.extensionRequests || []).find((e) => e.id === req.params.extId);
  if (!ext) {
    return res.status(404).json({ error: 'Extension request not found' });
  }

  const currentUser = getCurrentUser();
  const { decision, newExpiryDate, newExpiryTime, adminComment } = req.body;

  if (decision !== 'approved' && decision !== 'rejected') {
    return res.status(400).json({ error: 'Decision must be approved or rejected.' });
  }

  ext.status = decision;
  ext.reviewedAt = new Date().toISOString();
  ext.reviewedByUserId = currentUser.id;
  ext.reviewedByUserName = currentUser.name;
  ext.adminComment = adminComment || '';

  if (decision === 'approved') {
    ext.approvedExpiryDate = newExpiryDate || ext.requestedExpiryDate || share.schedule.expiryDate;
    ext.approvedExpiryTime = newExpiryTime || ext.requestedExpiryTime || share.schedule.expiryTime;

    // Apply new expiry to share schedule
    share.schedule.expiryDate = ext.approvedExpiryDate;
    share.schedule.expiryTime = ext.approvedExpiryTime;
    share.status = 'active';

    recordExternalAuditLog({
      shareId: share.id,
      documentId: share.documentId,
      documentNumber: share.documentNumber,
      revision: share.selectedRevision,
      externalUserId: share.externalUserId,
      externalUserName: share.recipientName,
      externalUserCompany: share.recipientCompany,
      performedByUserId: currentUser.id,
      performedByUserName: currentUser.name,
      actorType: 'internal',
      eventType: 'extension_approved',
      result: 'success',
      details: `Extension approved until ${share.schedule.expiryDate} ${share.schedule.expiryTime} by ${currentUser.name}${adminComment ? `. Note: "${adminComment}"` : ''}`,
    });
  } else {
    share.status = 'active'; // Returns to current evaluation status

    recordExternalAuditLog({
      shareId: share.id,
      documentId: share.documentId,
      documentNumber: share.documentNumber,
      revision: share.selectedRevision,
      externalUserId: share.externalUserId,
      externalUserName: share.recipientName,
      externalUserCompany: share.recipientCompany,
      performedByUserId: currentUser.id,
      performedByUserName: currentUser.name,
      actorType: 'internal',
      eventType: 'extension_rejected',
      result: 'denied',
      details: `Extension rejected by ${currentUser.name}${adminComment ? `. Reason: "${adminComment}"` : ''}`,
    });
  }

  saveDatabase();
  res.json({ share, extensionRequest: ext });
});

// 10. Update Review Comment Status & Decision
apiRouter.post('/external-comments/:id/status', (req: Request, res: Response) => {
  const db = getDb();
  const comment = (db.documentComments || []).find((c) => c.id === req.params.id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const currentUser = getCurrentUser();
  const { status, internalResponse, internalDecision } = req.body;

  if (status) comment.status = status;
  if (internalResponse) comment.internalResponse = internalResponse;
  if (internalDecision) comment.internalDecision = internalDecision;

  const eventMap: Record<string, ExternalAuditEventType> = {
    accepted: 'comment_accepted',
    rejected: 'comment_rejected',
    resolved: 'comment_resolved',
  };

  const eventType = eventMap[status] || 'comment_replied';

  recordExternalAuditLog({
    shareId: comment.shareId,
    documentId: comment.documentId,
    documentNumber: comment.documentNumber,
    revision: comment.revision,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    actorType: 'internal',
    eventType,
    result: 'success',
    details: `Comment ${comment.id} set to ${status} by ${currentUser.name}${internalDecision ? `. Decision: ${internalDecision}` : ''}`,
  });

  saveDatabase();
  res.json(comment);
});

// 11. "Apply Feedback" -> Generates New Revision in EDMS
apiRouter.post('/external-comments/:id/apply-feedback', (req: Request, res: Response) => {
  const db = getDb();
  const comment = (db.documentComments || []).find((c) => c.id === req.params.id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const doc = (db.technicalDocuments || []).find((d) => d.id === comment.documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Associated document not found in EDMS' });
  }

  const currentUser = getCurrentUser();
  const { newRevisionName, notes } = req.body;

  const revName = newRevisionName || `Rev ${doc.revisions.length}`;
  const issueNotes = notes || `Incorporated external review feedback from ${comment.authorName} (${comment.authorCompany}): "${comment.commentText.slice(0, 80)}"`;

  const newRev: DocumentRevision = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    revision: revName,
    issueDate: new Date().toISOString().slice(0, 10),
    issuedByUserId: currentUser.id,
    issuedByUserName: currentUser.name,
    reasonForIssue: 'Incorporating Client / External Review Comments',
    reviewStatus: 'code_2_approved_with_comments',
    notes: issueNotes,
    createdAt: new Date().toISOString(),
  };

  doc.revisions.unshift(newRev);
  doc.currentRevision = newRev.revision;
  doc.revisionDate = newRev.issueDate;
  doc.reasonForIssue = newRev.reasonForIssue;
  doc.reviewStatus = newRev.reviewStatus;
  doc.updatedAt = new Date().toISOString();

  // Mark comment as resolved with resultingRevision
  comment.status = 'resolved';
  comment.resultingRevision = revName;
  comment.internalDecision = `Resolved: incorporated into ${revName}`;

  recordExternalAuditLog({
    shareId: comment.shareId,
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    revision: revName,
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    actorType: 'internal',
    eventType: 'comment_resolved',
    result: 'success',
    details: `Applied comment feedback to issue new revision ${revName} in EDMS`,
  });

  recordAuditLog({
    correspondenceId: doc.id,
    correspondenceNumber: doc.documentNumber,
    action: 'NEW_DOCUMENT_REVISION',
    performedByUserId: currentUser.id,
    performedByUserName: currentUser.name,
    reason: `Issued ${revName} applying external review feedback on ${comment.documentNumber}`,
  });

  saveDatabase();
  res.json({ document: doc, comment, newRevision: newRev });
});

// 12. External Audit Logs Query
apiRouter.get('/external-audit-logs', (req: Request, res: Response) => {
  const db = getDb();
  let logs = db.externalAuditLogs || [];
  const { shareId, documentId } = req.query;

  if (shareId) {
    logs = logs.filter((l) => l.shareId === String(shareId));
  }
  if (documentId) {
    logs = logs.filter((l) => l.documentId === String(documentId));
  }

  res.json(logs);
});

// 13. External Users List
apiRouter.get('/external-users', (req: Request, res: Response) => {
  const db = getDb();
  res.json(db.externalUsers || []);
});

// ============================================================================
// SECURE EXTERNAL PROPOSAL VIEWER (DEDICATED EXTERNAL ACCESS LAYER)
// ============================================================================

// 1. Create External Access Session for a Proposal/Document
apiRouter.post('/external-access', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const {
    documentId,
    recipientName,
    recipientEmail,
    recipientCompany,
    selectedRevision,
    durationHours = 48,
    notes,
  } = req.body;

  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required.' });
  }
  if (!recipientName || !recipientName.trim()) {
    return res.status(400).json({ error: 'Recipient name is required.' });
  }
  if (!recipientEmail || !recipientEmail.trim()) {
    return res.status(400).json({ error: 'Recipient email is required.' });
  }

  const doc = (db.technicalDocuments || []).find((d) => d.id === documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Technical document not found in EDMS.' });
  }

  if (!db.externalAccessSessions) {
    db.externalAccessSessions = [];
  }

  const token = `ext-sec-${crypto.randomBytes(24).toString('hex')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const accessId = `ACC-${doc.documentType || 'PRP'}-${randomSuffix}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Number(durationHours) * 60 * 60 * 1000).toISOString();

  const session: ExternalAccessSession = {
    id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    token,
    accessId,
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    documentTitle: doc.title,
    selectedRevision: selectedRevision || doc.currentRevision || 'Rev 0',
    recipientName: recipientName.trim(),
    recipientEmail: recipientEmail.trim().toLowerCase(),
    recipientCompany: recipientCompany ? recipientCompany.trim() : doc.clientCompany || 'Client Organization',
    createdAt: now.toISOString(),
    expiresAt,
    durationHours: Number(durationHours),
    status: 'active',
    accessCount: 0,
    createdByUserId: currentUser?.id || 'usr-admin-1',
    createdByUserName: currentUser?.name || 'Ali Kashefi',
    notes: notes?.trim() || undefined,
  };

  db.externalAccessSessions.unshift(session);

  recordExternalAuditLog({
    shareId: session.id,
    documentId: doc.id,
    documentNumber: doc.documentNumber,
    revision: doc.currentRevision || 'Rev 0',
    externalUserName: session.recipientName,
    externalUserCompany: session.recipientCompany,
    performedByUserId: currentUser?.id,
    performedByUserName: currentUser?.name,
    actorType: 'internal',
    eventType: 'access_created',
    result: 'success',
    details: `Created secure external access link for ${session.recipientName} (${session.recipientEmail}). Valid for ${session.durationHours}h until ${new Date(expiresAt).toUTCString()}. Access ID: ${session.accessId}`,
  });

  saveDatabase();

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const secureAccessUrl = `${protocol}://${host}?ext_access_token=${session.token}`;

  res.status(201).json({
    success: true,
    session,
    secureAccessUrl,
  });
});

// 2. Fetch External Access Session & Proposal Data (Client-facing secure viewer)
apiRouter.get('/external-access/:token', (req: Request, res: Response) => {
  const db = getDb();
  const token = req.params.token;

  if (!db.externalAccessSessions) {
    db.externalAccessSessions = [];
  }

  const session = db.externalAccessSessions.find((s) => s.token === token);

  if (!session) {
    recordExternalAuditLog({
      shareId: 'unknown',
      documentId: 'unknown',
      documentNumber: 'UNKNOWN',
      revision: 'Rev 0',
      externalUserName: 'Unknown Visitor',
      externalUserCompany: 'Unknown',
      actorType: 'external',
      eventType: 'failed_access_attempt',
      result: 'denied',
      details: `Invalid or non-existent token provided: ${token.slice(0, 8)}...`,
    });
    saveDatabase();
    return res.status(404).json({
      error: 'Invalid or non-existent secure access link. Please request an authorized link from PJMAK Document Control.',
      status: 'not_found',
    });
  }

  // Check if revoked
  if (session.status === 'revoked') {
    recordExternalAuditLog({
      shareId: session.id,
      documentId: session.documentId,
      documentNumber: session.documentNumber,
      revision: 'Rev 0',
      externalUserName: session.recipientName,
      externalUserCompany: session.recipientCompany,
      actorType: 'external',
      eventType: 'failed_access_attempt',
      result: 'denied',
      details: `Blocked attempt to access revoked session ${session.accessId} by ${session.recipientName} (${session.recipientEmail}). Revoked at: ${session.revokedAt}`,
    });
    saveDatabase();
    return res.status(403).json({
      error: 'This secure access link has been revoked by PJMAK Document Control.',
      status: 'revoked',
      session: {
        accessId: session.accessId,
        recipientName: session.recipientName,
        recipientCompany: session.recipientCompany,
        documentTitle: session.documentTitle,
        documentNumber: session.documentNumber,
        revokedAt: session.revokedAt,
        revocationReason: session.revocationReason,
      },
    });
  }

  // Check if expired
  const now = Date.now();
  const expiryTime = new Date(session.expiresAt).getTime();

  if (now > expiryTime || session.status === 'expired') {
    session.status = 'expired';
    recordExternalAuditLog({
      shareId: session.id,
      documentId: session.documentId,
      documentNumber: session.documentNumber,
      revision: 'Rev 0',
      externalUserName: session.recipientName,
      externalUserCompany: session.recipientCompany,
      actorType: 'external',
      eventType: 'access_expired',
      result: 'denied',
      details: `Blocked attempt to access expired session ${session.accessId}. Expired at: ${session.expiresAt}`,
    });
    saveDatabase();
    return res.status(410).json({
      error: `This secure access session expired on ${new Date(session.expiresAt).toUTCString()} after its ${session.durationHours}-hour access window. Please contact PJMAK Document Control for a renewed access link.`,
      status: 'expired',
      session: {
        accessId: session.accessId,
        recipientName: session.recipientName,
        recipientCompany: session.recipientCompany,
        documentTitle: session.documentTitle,
        documentNumber: session.documentNumber,
        expiresAt: session.expiresAt,
      },
    });
  }

  // Active session! Update access metrics
  session.accessCount = (session.accessCount || 0) + 1;
  const isFirstOpen = !session.firstOpenedAt;
  if (isFirstOpen) {
    session.firstOpenedAt = new Date().toISOString();
  }
  session.lastOpenedAt = new Date().toISOString();

  // Audit log
  recordExternalAuditLog({
    shareId: session.id,
    documentId: session.documentId,
    documentNumber: session.documentNumber,
    revision: 'Rev 0',
    externalUserName: session.recipientName,
    externalUserCompany: session.recipientCompany,
    actorType: 'external',
    eventType: isFirstOpen ? 'first_opened' : 'subsequent_access',
    result: 'success',
    details: `${isFirstOpen ? 'First access' : `Access #${session.accessCount}`} to proposal by ${session.recipientName} (${session.recipientEmail}). Access ID: ${session.accessId}`,
  });

  saveDatabase();

  // Fetch document
  const doc = (db.technicalDocuments || []).find((d) => d.id === session.documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Referenced technical document not found in EDMS.' });
  }

  // Return clean viewer payload
  res.json({
    status: 'active',
    session: {
      id: session.id,
      token: session.token,
      accessId: session.accessId,
      recipientName: session.recipientName,
      recipientEmail: session.recipientEmail,
      recipientCompany: session.recipientCompany,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      durationHours: session.durationHours,
      accessCount: session.accessCount,
      firstOpenedAt: session.firstOpenedAt,
    },
    document: {
      id: doc.id,
      documentNumber: doc.documentNumber,
      title: doc.title,
      description: doc.description,
      discipline: doc.discipline,
      documentType: doc.documentType,
      originator: doc.originator,
      projectCode: doc.projectCode,
      projectName: doc.projectName,
      clientCompany: doc.clientCompany,
      clientContactPerson: doc.clientContactPerson,
      currentRevision: doc.currentRevision,
      revisionDate: doc.revisionDate,
      commercialValue: doc.commercialValue,
      currency: doc.currency,
      chapters: doc.chapters || [],
    },
  });
});

// 3. Revoke External Access Link (Internal User)
apiRouter.post('/external-access/:token/revoke', (req: Request, res: Response) => {
  const db = getDb();
  const currentUser = getCurrentUser();
  const token = req.params.token;
  const { reason } = req.body;

  if (!db.externalAccessSessions) {
    db.externalAccessSessions = [];
  }

  // Find by token or id or accessId
  const session = db.externalAccessSessions.find((s) => s.token === token || s.id === token || s.accessId === token);

  if (!session) {
    return res.status(404).json({ error: 'External access session not found.' });
  }

  session.status = 'revoked';
  session.revokedAt = new Date().toISOString();
  session.revocationReason = reason?.trim() || 'Revoked by PJMAK Document Control';
  session.revokedByUserId = currentUser?.id;
  session.revokedByUserName = currentUser?.name;

  recordExternalAuditLog({
    shareId: session.id,
    documentId: session.documentId,
    documentNumber: session.documentNumber,
    revision: 'Rev 0',
    externalUserName: session.recipientName,
    externalUserCompany: session.recipientCompany,
    performedByUserId: currentUser?.id,
    performedByUserName: currentUser?.name,
    actorType: 'internal',
    eventType: 'access_revoked',
    result: 'success',
    details: `Revoked external access ${session.accessId} for ${session.recipientName}. Reason: "${session.revocationReason}"`,
  });

  saveDatabase();

  res.json({ success: true, session });
});

// 4. Record Security Violation / Attempt from External Viewer
apiRouter.post('/external-access/:token/security-event', (req: Request, res: Response) => {
  const db = getDb();
  const token = req.params.token;
  const { eventType, details } = req.body;

  if (!db.externalAccessSessions) db.externalAccessSessions = [];
  const session = db.externalAccessSessions.find((s) => s.token === token);

  if (session) {
    recordExternalAuditLog({
      shareId: session.id,
      documentId: session.documentId,
      documentNumber: session.documentNumber,
      revision: 'Rev 0',
      externalUserName: session.recipientName,
      externalUserCompany: session.recipientCompany,
      actorType: 'external',
      eventType: eventType || 'print_attempted',
      result: 'denied',
      details: details || `Security violation intercepted on secure viewer for ${session.accessId}`,
    });
    saveDatabase();
  }

  res.json({ success: true });
});

// 5. Query External Access Sessions for a specific document
apiRouter.get('/external-access/document/:documentId', (req: Request, res: Response) => {
  const db = getDb();
  if (!db.externalAccessSessions) db.externalAccessSessions = [];

  const now = Date.now();
  // Auto update expired
  db.externalAccessSessions.forEach((s) => {
    if (s.status === 'active' && now > new Date(s.expiresAt).getTime()) {
      s.status = 'expired';
    }
  });

  const sessions = db.externalAccessSessions.filter((s) => s.documentId === req.params.documentId);
  res.json({ sessions });
});

// 6. Query all external access sessions
apiRouter.get('/external-access-sessions', (req: Request, res: Response) => {
  const db = getDb();
  if (!db.externalAccessSessions) db.externalAccessSessions = [];

  const now = Date.now();
  db.externalAccessSessions.forEach((s) => {
    if (s.status === 'active' && now > new Date(s.expiresAt).getTime()) {
      s.status = 'expired';
    }
  });

  res.json(db.externalAccessSessions);
});


