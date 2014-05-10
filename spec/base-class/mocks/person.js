angular
  .module('Mocks')
  .factory('Person', ['BaseClass', function(BaseClass) {

    Person.inherits(BaseClass.Base);

    function Person(attributes) {
      this.name  = attributes.name;
      this.age   = attributes.age;
      this.email = attributes.email;
    }

    return Person;
  }]);
