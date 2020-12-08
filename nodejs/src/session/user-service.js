const config = require('../env-variables');
const fetch = require('node-fetch');
require('url-search-params-polyfill');

class UserService {

  async getUserForMobileNumber(mobileNumber, tenantId) {
    let user = await this.loginOrCreateUser(mobileNumber, tenantId);
    user.userId = user.userInfo.uuid;
    user.mobileNumber = mobileNumber;
    user.name = user.userInfo.name;
    user.locale = user.userInfo.locale;
    return user;
  }

  async loginOrCreateUser(mobileNumber, tenantId) {
    let user = await this.loginUser(mobileNumber, tenantId);
    if(user === undefined) {
      await this.createUser(mobileNumber, tenantId);
      let user = await this.loginUser(mobileNumber, tenantId);
    }
    return user;
  }

  async loginUser(mobileNumber, tenantId) {
    let data = new URLSearchParams();
    data.append('grant_type', 'password');
    data.append('password', config.userServiceHardCodedPassword);
    data.append('userType', 'CITIZEN');

    data.append('tenantId', tenantId);
    data.append('username', mobileNumber);
    
    let headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': config.userLoginAuthorizationHeader
    }

    let url = config.userServiceHost + config.userServiceOAuthPath;
    let options = {
      method: 'POST',
      headers: headers,
      body: data
    }

    let response = await fetch(url, options);
    if(response.status === 200) {
      let body = await response.json();
      return {
        authToken: body.access_token,
        refreshToken: body.refresh_token,
        userInfo: body.UserRequest
      }
    } else {
      return undefined;
    }
  }

  async createUser(mobileNumber, tenantId) {
    let requestBody = {
      RequestInfo: {},
      User: {
        otpReference: config.userServiceHardCodedPassword,
        permamnentCity: tenantId,
        tenantId: tenantId,
        username: mobileNumber
      }
    }

    let url = config.userServiceHost + config.userServiceCreateCitizenPath;
    let options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    }

    let response = await fetch(url, options);
    if(response.status === 200) {
      let responseBody = await response.json();
      return responseBody;
    } else {
      console.error('User Create Error');
      return undefined;
    }

  }

}

module.exports = new UserService();