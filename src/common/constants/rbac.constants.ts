export enum PermissionAction {
  // Production permissions
  PRODUCTION_VIEW = 'production:view',
  PRODUCTION_EDIT = 'production:edit',
  PRODUCTION_CONTROL = 'production:control',

  // Script permissions
  SCRIPT_VIEW = 'script:view',
  SCRIPT_EDIT = 'script:edit',

  // Rundown permissions
  RUNDOWN_VIEW = 'rundown:view',
  RUNDOWN_EDIT = 'rundown:edit',
  RUNDOWN_CONTROL = 'rundown:control',

  // Intercom permissions
  INTERCOM_VIEW = 'intercom:view',
  INTERCOM_MANAGE = 'intercom:manage',
  INTERCOM_SEND = 'intercom:send',

  // Automation permissions
  AUTOMATION_VIEW = 'automation:view',
  AUTOMATION_MANAGE = 'automation:manage',

  // Media permissions
  MEDIA_VIEW = 'media:view',
  MEDIA_MANAGE = 'media:manage',

  // Analytics permissions
  ANALYTICS_VIEW = 'analytics:view',

  // Social permissions
  SOCIAL_VIEW = 'social:view',
  SOCIAL_MANAGE = 'social:manage',

  // Streaming permissions
  STREAMING_VIEW = 'streaming:view',
  STREAMING_MANAGE = 'streaming:manage',
  STREAMING_CONTROL = 'streaming:control',

  // Admin permissions
  ADMIN_ACCESS = 'admin:access',
}

export const StandardRoles = {
  ADMIN: {
    name: 'ADMIN',
    description: 'Administrador total del sistema',
    permissions: Object.values(PermissionAction),
  },
  DIRECTOR: {
    name: 'DIRECTOR',
    description: 'Control total de la producción y el guion',
    permissions: [
      PermissionAction.PRODUCTION_VIEW,
      PermissionAction.PRODUCTION_CONTROL,
      PermissionAction.SCRIPT_VIEW,
      PermissionAction.SCRIPT_EDIT,
      PermissionAction.RUNDOWN_VIEW,
      PermissionAction.RUNDOWN_EDIT,
      PermissionAction.RUNDOWN_CONTROL,
      PermissionAction.INTERCOM_VIEW,
      PermissionAction.INTERCOM_MANAGE,
      PermissionAction.INTERCOM_SEND,
      PermissionAction.AUTOMATION_VIEW,
      PermissionAction.AUTOMATION_MANAGE,
      PermissionAction.ANALYTICS_VIEW,
      PermissionAction.SOCIAL_VIEW,
      PermissionAction.SOCIAL_MANAGE,
      PermissionAction.MEDIA_VIEW,
      PermissionAction.MEDIA_MANAGE,
      PermissionAction.STREAMING_VIEW,
      PermissionAction.STREAMING_MANAGE,
      PermissionAction.STREAMING_CONTROL,
    ],
  },
  OPERATOR: {
    name: 'OPERATOR',
    description: 'Control de la producción y vista de guion',
    permissions: [
      PermissionAction.PRODUCTION_VIEW,
      PermissionAction.PRODUCTION_CONTROL,
      PermissionAction.SCRIPT_VIEW,
      PermissionAction.RUNDOWN_VIEW,
      PermissionAction.RUNDOWN_CONTROL,
      PermissionAction.INTERCOM_VIEW,
      PermissionAction.INTERCOM_SEND,
      PermissionAction.AUTOMATION_VIEW,
      PermissionAction.ANALYTICS_VIEW,
      PermissionAction.SOCIAL_VIEW,
      PermissionAction.MEDIA_VIEW,
      PermissionAction.STREAMING_VIEW,
      PermissionAction.STREAMING_CONTROL,
    ],
  },
  TALENT: {
    name: 'TALENT',
    description: 'Vista de guion y teleprompter',
    permissions: [
      PermissionAction.PRODUCTION_VIEW,
      PermissionAction.SCRIPT_VIEW,
      PermissionAction.RUNDOWN_VIEW,
      PermissionAction.STREAMING_VIEW,
    ],
  },
  VIEWER: {
    name: 'VIEWER',
    description: 'Solo lectura de la producción',
    permissions: [
      PermissionAction.PRODUCTION_VIEW,
      PermissionAction.SCRIPT_VIEW,
      PermissionAction.RUNDOWN_VIEW,
      PermissionAction.STREAMING_VIEW,
    ],
  },
  GUEST: {
    name: 'GUEST',
    description: 'Invitado o colaborador externo',
    permissions: [
      PermissionAction.PRODUCTION_VIEW,
      PermissionAction.SCRIPT_VIEW,
      PermissionAction.STREAMING_VIEW,
      PermissionAction.STREAMING_CONTROL, // Added so they can get tokens and publish
    ],
  },
};
