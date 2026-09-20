import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const ajv = addFormats(new Ajv({ allErrors: true }));
