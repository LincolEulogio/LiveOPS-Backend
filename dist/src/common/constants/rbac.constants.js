"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardRoles = exports.PermissionAction = void 0;
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["PRODUCTION_VIEW"] = "production:view";
    PermissionAction["PRODUCTION_EDIT"] = "production:edit";
    PermissionAction["PRODUCTION_CONTROL"] = "production:control";
    PermissionAction["SCRIPT_VIEW"] = "script:view";
    PermissionAction["SCRIPT_EDIT"] = "script:edit";
    PermissionAction["RUNDOWN_VIEW"] = "rundown:view";
    PermissionAction["RUNDOWN_EDIT"] = "rundown:edit";
    PermissionAction["RUNDOWN_CONTROL"] = "rundown:control";
    PermissionAction["INTERCOM_VIEW"] = "intercom:view";
    PermissionAction["INTERCOM_MANAGE"] = "intercom:manage";
    PermissionAction["INTERCOM_SEND"] = "intercom:send";
    PermissionAction["AUTOMATION_VIEW"] = "automation:view";
    PermissionAction["AUTOMATION_MANAGE"] = "automation:manage";
    PermissionAction["ANALYTICS_VIEW"] = "analytics:view";
    PermissionAction["SOCIAL_VIEW"] = "social:view";
    PermissionAction["SOCIAL_MANAGE"] = "social:manage";
    PermissionAction["ADMIN_ACCESS"] = "admin:access";
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
exports.StandardRoles = {
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
//# sourceMappingURL=rbac.constants.js.map