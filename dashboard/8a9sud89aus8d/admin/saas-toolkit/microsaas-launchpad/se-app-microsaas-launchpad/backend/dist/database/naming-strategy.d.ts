import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
export declare class PrefixNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    private prefix;
    constructor();
    tableName(targetName: string, userSpecifiedName: string | undefined): string;
    private toSnakeCase;
}
