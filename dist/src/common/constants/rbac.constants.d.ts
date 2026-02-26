export declare enum PermissionAction {
    PRODUCTION_VIEW = "production:view",
    PRODUCTION_EDIT = "production:edit",
    PRODUCTION_CONTROL = "production:control",
    SCRIPT_VIEW = "script:view",
    SCRIPT_EDIT = "script:edit",
    RUNDOWN_VIEW = "rundown:view",
    RUNDOWN_EDIT = "rundown:edit",
    RUNDOWN_CONTROL = "rundown:control",
    INTERCOM_VIEW = "intercom:view",
    INTERCOM_MANAGE = "intercom:manage",
    INTERCOM_SEND = "intercom:send",
    AUTOMATION_VIEW = "automation:view",
    AUTOMATION_MANAGE = "automation:manage",
    MEDIA_VIEW = "media:view",
    MEDIA_MANAGE = "media:manage",
    ANALYTICS_VIEW = "analytics:view",
    SOCIAL_VIEW = "social:view",
    SOCIAL_MANAGE = "social:manage",
    STREAMING_VIEW = "streaming:view",
    STREAMING_MANAGE = "streaming:manage",
    STREAMING_CONTROL = "streaming:control",
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
    GUEST: {
        name: string;
        description: string;
        permissions: PermissionAction[];
    };
};
