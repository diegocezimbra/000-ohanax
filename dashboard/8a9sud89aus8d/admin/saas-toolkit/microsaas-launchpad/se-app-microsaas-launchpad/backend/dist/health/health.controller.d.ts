export declare class HealthController {
    check(): {
        status: string;
        timestamp: string;
        uptime: number;
        memory: NodeJS.MemoryUsage;
    };
    live(): {
        status: string;
    };
    ready(): {
        status: string;
    };
}
