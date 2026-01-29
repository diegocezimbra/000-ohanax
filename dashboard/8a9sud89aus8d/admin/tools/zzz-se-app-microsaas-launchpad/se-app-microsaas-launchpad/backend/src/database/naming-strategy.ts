import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/**
 * Custom naming strategy that prefixes all table names with a configurable prefix.
 * The prefix is read from the DB_TABLE_PREFIX environment variable.
 * This allows multiple projects using this template to share the same database safely.
 */
export class PrefixNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  private prefix: string;

  constructor() {
    super();
    // Default prefix is 'app' if DB_TABLE_PREFIX is not set
    this.prefix = process.env.DB_TABLE_PREFIX || 'app';
  }

  /**
   * Overrides the default table name strategy to add a prefix.
   * @param targetName The entity class name
   * @param userSpecifiedName The name specified in @Entity() decorator
   * @returns The prefixed table name
   */
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    // Use the user-specified name if provided, otherwise convert class name to snake_case
    const baseName = userSpecifiedName || this.toSnakeCase(targetName);
    return `${this.prefix}_${baseName}`;
  }

  /**
   * Converts a PascalCase or camelCase string to snake_case.
   * @param str The string to convert
   * @returns The snake_case version of the string
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}
