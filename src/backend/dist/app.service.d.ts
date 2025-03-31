import { EntityManager } from '@mikro-orm/core';
export declare class AppService {
    private readonly em;
    constructor(em: EntityManager);
    getHello(): string;
    checkDbConnection(): Promise<boolean>;
}
