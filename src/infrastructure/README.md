# Infrastructure Module

Dieses Modul enthält die grundlegende Infrastruktur für die Anwendung, einschließlich des Logging-Frameworks und des Exception-Handling-Frameworks.

## Logging Framework

Das Logging-Framework bietet eine konsistente und konfigurierbare Möglichkeit, Logs in der gesamten Anwendung zu erstellen. Es basiert auf Pino und bietet erweiterte Funktionen wie:

- Kontextbezogenes Logging
- Korrelations-ID-Tracking zur Verfolgung von Anfragen
- Multi-Tenant-Unterstützung
- Konfigurierbare Log-Level und Formatierung
- Fortgeschrittene Funktionen wie Log-Rotation und Performance-Optimierungen

### Verwendung

```typescript
// In app.module.ts
import { Module } from '@nestjs/common';
import { LoggingModule } from './infrastructure';

@Module({
  imports: [
    LoggingModule.register({
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        prettyPrint: process.env.NODE_ENV !== 'production',
      },
    }),
  ],
})
export class AppModule {}
```

#### In Services und Controllern

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { LoggingService } from '../infrastructure/logging/interfaces';
import { LOGGING_SERVICE } from '../infrastructure/logging/logging.module';

@Injectable()
export class YourService {
  private logger: LoggingService;
  
  constructor(
    @Inject(LOGGING_SERVICE) logger: LoggingService,
  ) {
    // Erstelle einen kindbezogenen Logger mit Kontext
    this.logger = logger.createChildLogger({ context: 'YourService' });
  }
  
  someMethod() {
    this.logger.info('Informative Nachricht');
    this.logger.debug('Debug-Details', { additionalData: 'value' });
    
    try {
      // Operationen...
    } catch (error) {
      this.logger.error('Fehler aufgetreten', error as Error);
    }
  }
}
```

## Exception-Handling Framework

Das Exception-Handling-Framework bietet eine standardisierte Möglichkeit zum Umgang mit Fehlern in der Anwendung. Es umfasst:

- Eine Hierarchie von domänenspezifischen Ausnahmen
- Einen globalen Exception-Filter zur einheitlichen Fehlerbehandlung
- Konsistente Fehlerantworten mit detaillierten Informationen
- Integration mit dem Logging-Framework

### Ausnahmetypen

- `DomainException`: Basisklasse für alle domänenspezifischen Ausnahmen
- `EntityNotFoundException`: Für Szenarien, in denen eine Entity nicht gefunden wurde
- `ValidationException`: Für Validierungsfehler mit detaillierten Fehlermeldungen
- `UnauthorizedException`: Für Authentifizierungs- und Autorisierungsfehler
- `BusinessRuleException`: Für Verletzungen von Geschäftsregeln

### Verwendung

```typescript
// In app.module.ts
import { Module } from '@nestjs/common';
import { ExceptionsModule } from './infrastructure';

@Module({
  imports: [
    ExceptionsModule.register(),
  ],
})
export class AppModule {}
```

#### In Services und Controllern

```typescript
import { Injectable } from '@nestjs/common';
import { EntityNotFoundException, ValidationException } from '../infrastructure/exceptions';

@Injectable()
export class UserService {
  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    
    return user;
  }
  
  async create(userData: any) {
    const validationErrors = this.validate(userData);
    
    if (validationErrors) {
      throw new ValidationException(validationErrors);
    }
    
    // Benutzer erstellen...
  }
}
```

## Tests

Beide Module werden durch umfassende Tests abgedeckt, die die korrekte Funktionalität überprüfen.

- Logging Tests: `src/infrastructure/logging/test/logging.spec.ts`
- Exception Tests: `src/infrastructure/exceptions/test/exceptions.spec.ts`

## Beispiele

Im `examples`-Modul gibt es einen Beispiel-Controller, der die Verwendung des Logging- und Exception-Frameworks demonstriert:

- `src/examples/logging.controller.ts`

Dieser Controller bietet Endpunkte zum Testen verschiedener Log-Level und zum Auslösen verschiedener Ausnahmen.
