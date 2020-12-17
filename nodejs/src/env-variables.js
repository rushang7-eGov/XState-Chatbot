const os = require('os');

const envVariables = {
    serviceId : process.env.NAME || 'xstate-chatbot-server',
    ver : process.env.VERSION || '0.0.1',

    port: process.env.SERVICE_PORT || 8080,
    contextPath : process.env.CONTEXT_PATH || '/',

    whatsAppProvider: process.env.WHATSAPP_PROVIDER || 'console',

    serviceProvider: process.env.SERVICE_PROVIDER || 'dummy',

    repoProvider: process.env.REPO_PROVIDER || 'PostgreSQL',

    mdmsHost: process.env.MDMS_HOST || 'https://egov-micro-dev.egovernments.org/',

    localisationServiceHost: process.env.LOCALISATION_SERVICE_HOST || 'https://egov-micro-dev.egovernments.org/',
    localisationServiceSearchPath: process.env.LOCALISATION_SERVICE_SEARCH_PATH || 'localization/messages/v1/_search',

    rootTenantId: process.env.ROOT_TENANTID || 'pb',

    supportedLocales: process.env.SUPPORTED_LOCALES || 'en_IN,hi_IN',

    externalHost: process.env.EXTERNAL_HOST || 'https://egov-micro-dev.egovernments.org/',

    cityExternalWebpagePath: process.env.CITY_EXTERNAL_WEBPAGEPATH || 'citizen/openlink/whatsapp/city',
    localityExternalWebpagePath: process.env.LOCALITY_EXTERNAL_WEBPAGEPATH || 'citizen/openlink/whatsapp/locality',

    whatsAppBusinessNumber : process.env.WHATSAPP_BUSINESS_NUMBER || '917834811114',

    userServiceHost: process.env.USER_SERVICE_HOST || 'https://egov-micro-dev.egovernments.org/',
    userServiceOAuthPath: process.env.USER_SERVICEO_AUTHPATH || 'user/oauth/token',
    userServiceCreateCitizenPath: process.env.USER_SERVICE_CREATE_CITIZENPATH || 'user/citizen/_create',
    userServiceUpdateProfilePath: process.env.USER_SERVICE_UPDATE_PROFILEPATH || 'user/profile/_update',
    userServiceHardCodedPassword: process.env.USER_SERVICE_HARDCODEDPASSWORD || '123456',
    userLoginAuthorizationHeader: process.env.USER_LOGIN_AUTHORIZATION_HEADER || 'Basic ZWdvdi11c2VyLWNsaWVudDplZ292LXVzZXItc2VjcmV0',

    googleAPIKey: process.env.GOOGLE_APIKEY || ''
}

module.exports = envVariables;