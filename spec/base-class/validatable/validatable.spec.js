describe("BCValidatable", function() {

  var Validatable, Validator, Validation;
  beforeEach(inject(["BCValidatable", "BCValidatable.Validator", "BCValidatable.Validation",
  function(_BCValidatable_, _BCValidator_, _BCValidation_) {
    Validatable = _BCValidatable_;
    Validator   = _BCValidator_;
    Validation  = _BCValidation_;
  }]));

  // # Validators
  // =============
  //
  // Validators are registerable, configurable constructors that return validation functions, which
  // are capable of validating values and reporting error messages.
  //
  //    factory('MinValidator', ['Validatable.Validator', function(Validator) {
  //      function min(value) {
  //        return value.length >= this.min;
  //      }
  //
  //      min.message = function() {
  //        return "must be greater than " + this.min + " characters.";
  //      }
  //
  //      return new Validator(min);
  //    }]);
  //
  // By registering this function as a validator, we obtain the ability to use it in our models:
  //
  //    Post.validates({
  //      title: {
  //        min: 5
  //      }
  //    });
  //
  // In low-level terms, registered validators expose one function, configure:
  //
  //    // example from above
  //    MinValidator.configure(5);
  //
  //    // with additional options
  //    MinValidator.configure({value: 5, message: "Must be larger than that."});
  //
  // ## Define Arbitrary Configuration Options
  // ========================================== 
  //
  // A configured validator returns a validation function, with its error message and options
  // set. The options are all exposed on the context of the validation function:
  //
  //    function numericality(value) {
  //      if (this.ignore) value = value.replace(this.ignore, '');
  //      return !(isNaN(value));
  //    }
  //
  //    moneyValidationFn = NumericalityValidator.configure({
  //      ignore: /^\$/
  //    });
  //
  // Each field on your models can configure the validator with different options.
  //
  // ## Registering Validators with Children
  // ========================================
  //
  // Sometimes we want to describe a collection of validations under the same name in our DSL:
  //
  //    Post.validates({
  //      title: {
  //        length: {
  //          min: 5,
  //          max: 10
  //        }
  //      }
  //    });
  //
  // Here we say that the length validator has two children--in this example, the user is actually
  // naming two separate validators--min & max length.
  //
  // To create this grouping of validators:
  //
  // 1) Create the children
  //
  //    factory('MinValidator', ['Validator', function() {
  //      ...
  //      return new Validator(min);
  //    }]);
  //
  //    factory('MaxValidator', ['Validator', function() {
  //      ...
  //      return new Validator(max);
  //    }]);
  //
  // 2) Name the children as options of the parent:
  //
  //    factory('LengthValidator', ['MinValidator', 'MaxValidator', 'Validatable.Validator', 
  //      function(min, max, Validator) {
  //
  //      function length() {}
  //
  //      length.options = {
  //        min: minValidator,
  //        max: maxValidator
  //      }
  //
  //      return new Validator(length);
  //    }]);
  //
  // Configuring LengthValidator will now configure any associated children:
  //
  //    // example above
  //    LengthValidator.configure({
  //      min: 5,
  //      max: 10
  //    });
  //
  //    // calls
  //    MinValidator.configure(5);
  //    MaxValidator.configure(10);
  //
  //    // returns
  //    [configuredMinFn, configuredMaxFn]
  //
  // ## Interaction with the Validatable Module
  // ===========================================
  //
  // Validatable itself exposes the method #validates, which sets the collection of validations for 
  // each model it is mixed into. When it receives a configuration like:
  //
  //    Post.validates({
  //      title: {
  //        required: true,
  //        length: { in: _.range(1, 20) }
  //      },
  //      slug: {
  //        ...
  //      }
  //    });
  //
  // It loops through each field, takes the name of each validation, and configures the validation,
  // passing in the options provided. It will either receive in return a single configured validation
  // function, or an array of configured validation functions (as in the case of the LengthValidator).
  //
  // It transforms each validation function it receives into a Validation--a combination of the
  // field name, validation function, and message.
  //
  // When a Validatable model calls #validate([field]) on a particular instance, under the covers 
  // Validatable checks the validations for the specified field (or all fields if none is provided),
  // and hands off the request to each Validation. Validation#validate receives an instance, and
  // already knows which field to validate, which configured validation function to call, and
  // what error message to return in the case the value is invalid.
  describe("Validators that receive values", function() {
    var minValidator, configuredMinFn;
    beforeEach(function() { 
      function minimum(value) {
        return value.length >= this.minimum;
      }

      minimum.message = function() {
        return "Must be greater than " + this.minimum;
      }

      minValidator    = new Validator(minimum);
      configuredMinFn = minValidator.configure(5);
    });

    it("curries in the configured values to the validationFn", function() { 
      expect(configuredMinFn("hello")).toEqual(true);
      expect(configuredMinFn("hi")).toEqual(false);
    });

    it("configures the message", function() { 
      expect(configuredMinFn.message).toEqual("Must be greater than 5");
    });
  });

  describe("Validators with special options", function() {
    var numericalityValidator, configuredNumericalityFn;
    beforeEach(function() {
      function numericality(value) {
        if (this.ignore) value = value.replace(this.ignore, '');
        return !(isNaN(value))
      }

      numericality.message = function() {
        return "Must be a number";
      }

      var validationConfiguration = {
        ignore: /^\$/,
        message: function() {
          return "Must be a number. Can include " + String(this.ignore);
        }
      }

      numericalityValidator    = new Validator(numericality);
      configuredNumericalityFn = numericalityValidator.configure(validationConfiguration);
    });

    it("passes custom configuration options into the validationFn", function() { 
      expect(configuredNumericalityFn("$5.00")).toBe(true);
    });

    it("passes custom configuration options into the message", function() { 
      expect(configuredNumericalityFn.message).toBe("Must be a number. Can include /^\\\$/");
    });
  });

  describe("Validators with children", function() {
    var lengthValidator, minValidator, maxValidator, configuredLengthFunctions, configuredMinFn,
    configuredMaxFn;

    beforeEach(function() { 
      function minimum(value) {
        return value.length >= this.minimum;
      }

      minimum.message = function() {
        return "Must be more than " + this.minimum;
      }

      minValidator = new Validator(minimum);

      function maximum(value) {
        return value.length <= this.maximum;
      }

      maximum.message = function() {
        return "Must be less than " + this.maximum;
      }

      maxValidator = new Validator(maximum);

      function len() {}

      len.message = "is not the correct length.";

      len.options = {
        minimum: minValidator,
        maximum: maxValidator
      }

      lengthValidator           = new Validator(len);

      configuredLengthFunctions = lengthValidator.configure({minimum: 5, maximum: 10});
      configuredMinFn           = configuredLengthFunctions[0];
      configuredMaxFn           = configuredLengthFunctions[1];
    });

    it("configures each child validator", function() { 
      expect(configuredMinFn("hi")).toBe(false);
      expect(configuredMaxFn("hello")).toBe(true);
    });

    it("configures the default message for each child validation if no configuration is set", function() {
      expect(configuredMinFn.message).toBe("Must be more than 5");
      expect(configuredMaxFn.message).toBe("Must be less than 10");
    });

    it("uses configuration options to override the default message", function() {
      var lengthConfiguration = {
        minimum: {value: 5, message: "Must be longer than that."},
        maximum: {value: 10, message: function() { return "I just like the number " + this.maximum; } }
      };

      var configuredLengthFunctions = lengthValidator.configure(lengthConfiguration),
      configuredMinFn               = configuredLengthFunctions[0],
      configuredMaxFn               = configuredLengthFunctions[1];

      expect(configuredMinFn.message).toBe("Must be longer than that.");
      expect(configuredMaxFn.message).toBe("I just like the number 10");
    });
  });

  // # Validations
  // ==============
  //
  // Validations marry validation functions with a particular field on a model. They expose the validation function's
  // message, and a #validate method:
  //
  //    var validationExample = new Validation("name", configuredRequiredValidator);
  //    validationExample.validate({name: "Brett"})
  //    >> true
  //
  // Calls the field on the instance passed:
  //
  //    validation.validate = function(instance) {
  //      return validation.validationFn(instance[field]);
  //    }
  //
  describe("Validations", function() {
    var minValidator, minValidation, configuredMinValidationFn, user;
    beforeEach(function() {
      function minimum(value) {
        return value.length >= this.minimum;
      }

      minimum.message = function() {
        return "Must be more than " + this.minimum;
      }

      minValidator              = new Validator(minimum);
      configuredMinValidationFn = minValidator.configure(5);
      minValidation             = new Validation("name", configuredMinValidationFn);
      user                      = {name: "Brett"};
    });

    it("uses the validation function on a particular field", function() {
      expect(minValidation.validate(user)).toBe(true);
      user.name = "";
      expect(minValidation.validate(user)).toBe(false);
    });

    it("exposes the message of the configured validation", function() {
      expect(minValidation.message).toBe("Must be more than 5");
    });
  });
});
