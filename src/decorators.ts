import { Container, Inject as TypediInject, Token } from 'typedi';
import Vue from 'vue';
import { createDecorator } from 'vue-class-component';

import { setInjection } from './utils';

type InjectType = ((type?: any) => Function) | string | Token<any>;

export function Inject(type?: (type?: any) => Function): Function;
export function Inject(serviceName?: string): Function;
export function Inject(token: Token<any>): Function;

export function Inject(typeOrName?: InjectType) {
  return (target: any, propertyName: string, index?: number) => {
    if (target instanceof Vue) {
      // Use special injection method
      let identifier: any;
      if (typeof typeOrName === 'string') {
        identifier = typeOrName;
      } else if (typeOrName instanceof Token) {
        identifier = typeOrName;
      } else {
        identifier = (Reflect as any).getMetadata('design:type', target, propertyName);
      }

      const value = () => Container.get<any>(identifier);
      const decorator = createDecorator(options => {
        setInjection(options, propertyName, value);
      });
      decorator(target, propertyName, index!);
    } else {
      // Use typedi inject
      const decorator = TypediInject(typeOrName as any);
      decorator(target, propertyName, index);
    }
  };
}

export function Injectable() {
  return <T extends { new (...args: any[]): {} }>(target: T) => {
    const handlers = Container.handlers.filter(handler => handler.object.constructor === target);

    const type = function(...args: any[]) {
      const instance = new target(...args);
      handlers.forEach(handler => {
        if (handler.propertyName) {
          instance[handler.propertyName] = handler.value(Container.of(undefined));
        }
      });
      return instance;
    } as any;

    type.prototype = target.prototype;
    return type;
  };
}
