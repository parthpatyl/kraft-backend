import Joi from 'joi';

const enquirySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
  email: Joi.string().trim().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/).required()
    .messages({
      'string.pattern.base': 'Phone must be a valid number with country code (e.g., +1234567890)',
      'any.required': 'Phone is required',
    }),
  destination: Joi.string().trim().min(2).max(200).required()
    .messages({
      'string.min': 'Destination must be at least 2 characters',
      'string.max': 'Destination must not exceed 200 characters',
      'any.required': 'Destination is required',
    }),
  travelDate: Joi.date().iso().required()
    .messages({
      'date.format': 'Travel date must be a valid ISO date (YYYY-MM-DD)',
      'any.required': 'Travel date is required',
    }),
  guests: Joi.number().integer().min(1).max(50).default(1)
    .messages({
      'number.min': 'At least 1 guest is required',
      'number.max': 'Maximum 50 guests allowed',
    }),
  notes: Joi.string().trim().max(2000).allow('', null).default('')
    .messages({
      'string.max': 'Notes must not exceed 2000 characters',
    }),
  preferences: Joi.object({
    accommodations: Joi.string().valid('budget', 'standard', 'luxury').optional(),
    dietary: Joi.string().allow('').optional(),
    activities: Joi.array().items(Joi.string()).optional(),
  }).optional(),
}).options({ stripUnknown: true });

export default function validateEnquiry(req, res, next) {
  const { error, value } = enquirySchema.validate(req.body, { abortEarly: false });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: details,
    });
  }

  req.validatedBody = value;
  next();
}
