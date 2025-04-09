import { Cacheable, CacheableOptions } from '../cacheable.decorator';
import { CACHE_TTL_METADATA, CACHE_TAGS_METADATA } from '../cache.constants';
import { DEFAULT_CACHE_TTL } from '../cache.constants';

describe('Cacheable Decorator', () => {
  describe('without options', () => {
    @Cacheable()
    class TestClass {
      testMethod() {
        return 'test';
      }
    }

    it('should set default TTL metadata', () => {
      // Arrange
      const metadata = Reflect.getMetadata(CACHE_TTL_METADATA, TestClass.prototype.testMethod);

      // Assert
      expect(metadata).toBe(DEFAULT_CACHE_TTL);
    });

    it('should set empty tags metadata', () => {
      // Arrange
      const metadata = Reflect.getMetadata(CACHE_TAGS_METADATA, TestClass.prototype.testMethod);

      // Assert
      expect(metadata).toEqual([]);
    });
  });

  describe('with options', () => {
    const options: CacheableOptions = {
      ttl: 3600,
      tags: ['test-tag'],
    };

    @Cacheable(options)
    class TestClassWithOptions {
      testMethod() {
        return 'test';
      }
    }

    it('should set custom TTL metadata', () => {
      // Arrange
      const metadata = Reflect.getMetadata(CACHE_TTL_METADATA, TestClassWithOptions.prototype.testMethod);

      // Assert
      expect(metadata).toBe(options.ttl);
    });

    it('should set custom tags metadata', () => {
      // Arrange
      const metadata = Reflect.getMetadata(CACHE_TAGS_METADATA, TestClassWithOptions.prototype.testMethod);

      // Assert
      expect(metadata).toEqual(options.tags);
    });
  });

  describe('on class methods', () => {
    class TestMethodClass {
      @Cacheable({ ttl: 1800, tags: ['method-tag'] })
      testMethod() {
        return 'test';
      }
    }

    it('should set metadata on method', () => {
      // Arrange
      const ttlMetadata = Reflect.getMetadata(CACHE_TTL_METADATA, TestMethodClass.prototype.testMethod);
      const tagsMetadata = Reflect.getMetadata(CACHE_TAGS_METADATA, TestMethodClass.prototype.testMethod);

      // Assert
      expect(ttlMetadata).toBe(1800);
      expect(tagsMetadata).toEqual(['method-tag']);
    });
  });
}); 