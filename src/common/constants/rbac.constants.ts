export enum PermissionAction {
    // Production permissions
    PRODUCTION_VIEW = 'production:view',
    PRODUCTION_EDIT = 'production:edit',
    PRODUCTION_CONTROL = 'production:control', // Start/Stop streaming, scene switching

    // Script permissions
    SCRIPT_VIEW = 'script:view',
    SCRIPT_EDIT = 'script:edit',

    // Rundown permissions
    RUNDOWN_VIEW = 'rundown:view',
    RUNDOWN_EDIT = 'rundown:edit',
    RUNDOWN_CONTROL = 'rundown:control', // Start/Complete/Reset blocks

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
        ],
    },
    TALENT: {
        name: 'TALENT',
        description: 'Vista de guion y teleprompter',
        permissions: [
            PermissionAction.PRODUCTION_VIEW,
            PermissionAction.SCRIPT_VIEW,
            PermissionAction.RUNDOWN_VIEW,
        ],
    },
    VIEWER: {
        name: 'VIEWER',
        description: 'Solo lectura de la producción',
        permissions: [
            PermissionAction.PRODUCTION_VIEW,
            PermissionAction.SCRIPT_VIEW,
            PermissionAction.RUNDOWN_VIEW,
        ],
    },
};
