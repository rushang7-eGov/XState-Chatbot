const fetch = require("node-fetch");
const config = require('../../env-variables');

class PersonService {

  async createPerson(person, mobileNumber) {
    var query = `
    mutation insert_person($object: person_insert_input!) {
      insert_person_one(object: $object) {
        uuid
      }
    }    
    `
    var options = {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        variables: {
          "object": {
            "first_name": person.first_name,
            "age": person.age,
            "gender": person.gender,
            "mobile": mobileNumber,
            "mobile_code": "91"
          }
        },
        operationName: "insert_person"
      }),
      headers: {
        'x-hasura-admin-secret': config.hasuraAdminSecret,
      }
    }

    let response = await fetch(config.hasuraUrl, options);
    let data = await response.json()

    person.uuid = data.data.insert_person_one.uuid;
    return person;
  }

  async getPersonsForMobileNumber(mobileNumber) {

    var query = `
    query get_people($mobile: String!) {
      person(where: {mobile: {_eq: $mobile}}) {
        uuid
        gender
        age
        first_name
        mobile
        mobile_code
        c19_triage {
          subscribe
        }        
      }
    }    
    `
    var options = {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        variables: {
          "mobile": mobileNumber
        },
        operationName: "get_people"
      }),
      headers: {
        'x-hasura-admin-secret': config.hasuraAdminSecret,
      }
    }

    let response = await fetch(config.hasuraUrl, options);
    let data = await response.json()

    return data.data.person;
  }

  async getSubscribedPeople(mobileNumber) {
    let people = await this.getPersonsForMobileNumber(mobileNumber)
    let subscribedPeople = []
    for (let i = 0; i < people.length; i++) {

      if (people[i].c19_triage && people[i].c19_triage.subscribe) {
        subscribedPeople.push(people[i])
      }
    }
    return subscribedPeople
  }
}

module.exports = new PersonService();