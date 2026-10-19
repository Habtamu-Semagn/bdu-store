import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Confirms that a field matches another property on the same object.
 * Used for the password confirmation field.
 */
export function IsMatchingField(
  field: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isMatchingField',
      target: object.constructor,
      propertyName,
      constraints: [field],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [other] = args.constraints as [string];
          return value === (args.object as Record<string, unknown>)[other];
        },
        defaultMessage(args: ValidationArguments): string {
          const [other] = args.constraints as [string];
          return `Confirm password must match the ${other.replace(/([A-Z])/g, ' $1').toLowerCase()}.`;
        },
      },
    });
  };
}