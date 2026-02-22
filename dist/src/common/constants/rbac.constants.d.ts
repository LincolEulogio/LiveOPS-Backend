export declare enum PermissionAction {
    PRODUCTION_VIEW = "production:view",
    PRODUCTION_EDIT = "production:edit",
    PRODUCTION_CONTROL = "production:control",
    SCRIPT_VIEW = "script:view",
    SCRIPT_EDIT = "script:edit",
    RUNDOWN_VIEW = "rundown:view",
    RUNDOWN_EDIT = "rundown:edit",
    RUNDOWN_CONTROL = "rundown:control",
    ADMIN_ACCESS = "admin:access"
}
export declare const StandardRoles: {
    ADMIN: {
        name: string;
        description: string;
        permissions: PermissionAction[];
    };
    DIRECTOR: {
        name: string;
        description: string;
        permissions: PermissionAction[];
    };
    OPERATOR: {
        name: string;
        description: string;
        permissions: PermissionAction[];
    };
    TALENT: {
        name: string;
        description: string;
        permissions: PermissionAction[];
    };
    VIEWER: {
        name: string;
        description: string;
        permissions: PermissionAction[];
    };
};
