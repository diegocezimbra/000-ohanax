"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerModule = void 0;
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const winston = require("winston");
const isProduction = process.env.NODE_ENV === 'production';
let LoggerModule = class LoggerModule {
};
exports.LoggerModule = LoggerModule;
exports.LoggerModule = LoggerModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            nest_winston_1.WinstonModule.forRoot({
                level: isProduction ? 'info' : 'debug',
                format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), isProduction
                    ? winston.format.json()
                    : winston.format.combine(winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
                        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                        return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${metaStr}${trace ? `\n${trace}` : ''}`;
                    }))),
                transports: [
                    new winston.transports.Console(),
                    ...(isProduction
                        ? [
                            new winston.transports.File({
                                filename: 'logs/error.log',
                                level: 'error',
                                maxsize: 10485760,
                                maxFiles: 5,
                            }),
                            new winston.transports.File({
                                filename: 'logs/combined.log',
                                maxsize: 10485760,
                                maxFiles: 5,
                            }),
                        ]
                        : []),
                ],
                defaultMeta: { service: 'authify' },
            }),
        ],
        exports: [nest_winston_1.WinstonModule],
    })
], LoggerModule);
//# sourceMappingURL=logger.module.js.map