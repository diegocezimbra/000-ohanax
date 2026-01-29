"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrefixNamingStrategy = void 0;
const typeorm_1 = require("typeorm");
class PrefixNamingStrategy extends typeorm_1.DefaultNamingStrategy {
    constructor() {
        super();
        this.prefix = process.env.DB_TABLE_PREFIX || 'app';
    }
    tableName(targetName, userSpecifiedName) {
        const baseName = userSpecifiedName || this.toSnakeCase(targetName);
        return `${this.prefix}_${baseName}`;
    }
    toSnakeCase(str) {
        return str
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, '');
    }
}
exports.PrefixNamingStrategy = PrefixNamingStrategy;
//# sourceMappingURL=naming-strategy.js.map