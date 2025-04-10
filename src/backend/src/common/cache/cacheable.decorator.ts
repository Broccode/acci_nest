import { UseInterceptors } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { CacheableInterceptor } from './cacheable.interceptor';

export interface CacheableOptions {
  ttl?: number;
  tags?: string[];
}

// Typen für Klassen-Konstruktoren und Methoden
type Constructor = abstract new (...args: unknown[]) => unknown;
type DecoratorFunction = <T extends Constructor>(target: T) => T;
type MethodDecoratorFunction = <T extends (...args: unknown[]) => unknown>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T>;

export function Cacheable(
  options: CacheableOptions = {}
): DecoratorFunction & MethodDecoratorFunction {
  const ttl = options.ttl || 3600;
  const tags = options.tags || [];

  return ((
    target: Constructor | object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<(...args: unknown[]) => unknown>
  ): Constructor | TypedPropertyDescriptor<(...args: unknown[]) => unknown> => {
    if (propertyKey && descriptor) {
      // Method decorator
      SetMetadata('cache:ttl', ttl)(target, propertyKey, descriptor);
      SetMetadata('cache:tags', tags)(target, propertyKey, descriptor);
      const result = UseInterceptors(CacheableInterceptor)(target, propertyKey, descriptor);
      return result as TypedPropertyDescriptor<(...args: unknown[]) => unknown>;
    }

    // Class decorator
    const classConstructor = target as Constructor;
    const proto = classConstructor.prototype;
    const methods = Object.getOwnPropertyNames(proto).filter(
      (prop) => typeof proto[prop] === 'function' && prop !== 'constructor'
    );

    for (const method of methods) {
      const methodDescriptor = Object.getOwnPropertyDescriptor(proto, method);
      if (methodDescriptor) {
        SetMetadata('cache:ttl', ttl)(proto, method, methodDescriptor);
        SetMetadata('cache:tags', tags)(proto, method, methodDescriptor);
        UseInterceptors(CacheableInterceptor)(proto, method, methodDescriptor);
      }
    }

    return classConstructor;
  }) as DecoratorFunction & MethodDecoratorFunction;
}
