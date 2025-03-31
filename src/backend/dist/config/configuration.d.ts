declare const _default: () => {
    port: number;
    environment: string;
    jwt: {
        secret: string;
        expiresIn: number;
    };
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        name: string;
        synchronize: boolean;
        logging: boolean;
    };
    redis: {
        host: string;
        port: number;
    };
    cors: {
        enabled: boolean;
        origin: string;
    };
    swagger: {
        enabled: boolean;
        title: string;
        description: string;
        version: string;
        path: string;
    };
};
export default _default;
