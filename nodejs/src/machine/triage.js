const { assign } = require('xstate');
const dialog = require('./util/dialog.js');
const { personService, triageService } = require('./service/service-loader');
const { context } = require('./chat-machine.js');
const { upsertTriageDetails } = require('./service/dummy-triage-service.js');

const triageFlow = {
  id: 'triageFlow',
  initial: 'personName',
  onEntry: assign((context, event) => {
    context.slots.triage = {};
    context.slots.triage.person = {};
  }),
  states: {
    personName: {
      id: 'personName',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(messages.personName.prompt, context.user.locale));
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            if (event.message.type == 'text' && event.message.input.length < 100) {
              context.slots.triage.person.name = dialog.get_input(event, false);
              context.validMessage = true;
            } else {
              context.validMessage = false;
            }
          }),
          always: [
            {
              cond: (context) => context.validMessage,
              target: '#personAge'
            },
            {
              target: 'error'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(messages.personName.error, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    }, // personName
    personAge: {
      id: 'personAge',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            let message = dialog.get_message(messages.personAge.prompt, context.user.locale);
            message = message.replace('{{name}}', context.slots.triage.person.name);
            dialog.sendMessage(context, message);
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            if (event.message.type == 'text') {
              let age = parseInt(dialog.get_input(event, false));
              if (age > 0 && age < 120) {
                context.slots.triage.person.age = age;
                context.validMessage = true;
                return;
              }
            }
            context.validMessage = false;
          }),
          always: [
            {
              cond: (context) => context.validMessage,
              target: '#personGender'
            },
            {
              target: 'error'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(messages.personAge.error, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    }, // personAge
    personGender: {
      id: 'personGender',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            let { grammer, prompt } = dialog.constructListPromptAndGrammer(messages.personGender.options.list, messages.personGender.options.messageBundle, context.user.locale);
            context.grammer = grammer;
            let message = dialog.get_message(messages.personGender.prompt, context.user.locale) + '\n' + prompt;
            dialog.sendMessage(context, message);
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event);
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              actions: assign((context, event) => {
                context.slots.triage.person.gender = context.intention;
              }),
              target: '#persistPerson'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    }, // personGender
    persistPerson: {
      id: 'persistPerson',
      invoke: {
        src: (context) => personService.createPerson(context.slots.triage.person, context.user.mobileNumber),
        onDone: {
          actions: assign((context, event) => {
            context.slots.triage.person = event.data;
          }),
          target: '#symptoms'
        }
        // TODO: handle duplicate person??
      }
    },
    symptoms: {
      id: 'symptoms',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            let message = dialog.get_message(messages.symptoms.prompt, context.user.locale);
            message = message.replace('{{name}}', context.slots.triage.person.name);
            message += grammers.binaryChoice.prompt;
            context.grammer = grammers.binaryChoice.grammer;
            dialog.sendMessage(context, message);
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event);
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              actions: assign((context, event) => {
                context.slots.triage.symptoms = context.intention
              }),
              target: '#rtpcr'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    },
    rtpcr: {
      id: 'rtpcr',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            context.grammer = grammer.rtpcrTest;
            dialog.sendMessage(context, dialog.get_message(messages.rtpcr.prompt, context.user.locale));
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event);
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              actions: assign((context, event) => {
                context.slots.triage.rtpcr = context.intention
              }),
              target: '#triageEvaluator1'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    },
    triageEvaluator1: {
      id: 'triageEvaluator1',
      onEntry: assign((context, event) => {
        let triage = context.slots.triage;
        if(triage.person.age > 60 && (triage.symptoms || triage.rtpcr == 'positive')) {
          context.slots.triage.conclusion = 'ageConsultDoctorEnd'
        }
      }),
      always: [
        {
          cond: (context) => context.slots.triage.conclusion == 'ageConsultDoctorEnd',
          actions: assign((context, event) => {
            let message = dialog.get_message(messages.endFlow.ageConsultDoctorEnd, context.user.locale);
            message = message.replace('{{name}}', context.slots.triage.person.name);
            dialog.sendMessage(context, message);
          }),
          target: '#upsertTriageDetails'
        },
        {
          target: '#comorbidity'
        }
      ]
    },
    comorbidity: {
      id: 'comorbidity',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            context.grammer = grammers.binaryChoice.grammer;
            let message = '';
            if (context.slots.triage.person.gender == 'female')
              message = dialog.get_message(messages.comorbidity.prompt.female, context.user.locale);
            else
              message = dialog.get_message(messages.comorbidity.prompt.male, context.user.locale);
            message += grammers.binaryChoice.prompt;
            dialog.sendMessage(context, message);
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event);
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              actions: assign((context, event) => {
                context.slots.triage.isComorbid = context.intention;
              }),
              target: '#triageEvaluator2'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    },
    triageEvaluator2: {
      id: 'triageEvaluator2',
      onEntry: assign((context, event) => {
        let triage = context.slots.triage;
        if(triage.symptoms && triage.isComorbid) {
          context.slots.triage.conclusion = 'symptomComorbidConsultDoctorEnd';
        } else if(triage.rtpcr == 'positive' && triage.isComorbid) {
          context.slots.triage.conclusion = 'testComorbidConsultDoctorEnd';
        } else if(triage.isComorbid) {
          context.slots.triage.conclusion = 'precautionEnd';
        } else if(!triage.symptoms && !triage.isComorbid && triage.rtpcr != 'positive') {
          context.slots.triage.conclusion = 'noCovidEnd';
        }
      }),
      always: [
        {
          cond: (context) => context.slots.triage.conclusion,
          actions: assign((context, event) => {
            let message = dialog.get_message(messages.endFlow[context.slots.triage.conclusion], context.user.locale);
            message = message.replace('{{name}}', context.slots.triage.person.name);
            dialog.sendMessage(context, message);
          }),
          target: '#upsertTriageDetails'
        },
        {
          target: '#triageSpo2'
        }
      ]
    },
    triageSpo2: {
      id: 'triageSpo2',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            let message = dialog.get_message(messages.triageSpo2.prompt.preamble, context.user.locale);
            let { prompt, grammer } = dialog.constructListPromptAndGrammer(messages.triageSpo2.prompt.options.list, messages.triageSpo2.prompt.options.messageBundle, context.user.locale);
            message += prompt;
            context.grammer = grammer;
            dialog.sendMessage(context, message);
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event);
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              cond: (context) => context.intention == 'above95',
              actions: assign((context, event) => {
                dialog.sendMessage(context, dialog.get_message(messages.normalSpo2, context.user.locale), false);
              }),
              target: '#subscribe'
            },
            {
              cond: (context) => context.intention == '90to94',
              target: '#triageSpo2Walk'
            },
            {
              cond: (context) => context.intention == 'below90',
              actions: assign((context, event) => {
                context.slots.triage.conclusion = 'lowSpo2End'
                let message = dialog.get_message(messages.endFlow.lowSpo2End, context.user.locale);
                message = message.replace('{{name}}', context.slots.triage.person.name);
                dialog.sendMessage(context, message);
              }),
              target: '#upsertTriageDetails'
            },
            {
              cond: (context) => context.intention = 'noOximeter',
              actions: assign((context, event) => {
                context.slots.triage.conclusion = 'noOximeterEnd';
                let message = dialog.get_message(messages.endFlow.noOximeterEnd, context.user.locale)
                message = message.replace('{{name}}', context.slots.triage.person.name);
                dialog.sendMessage(context, message);
              }),
              target: '#upsertTriageDetails'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    },
    triageSpo2Walk: {
      id: 'triageSpo2Walk',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(messages.triageSpo2Walk.prompt, context.user.locale));
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            let spo2 = parseInt(dialog.get_input(event));
            if (spo2 > 0 && spo2 <= 100) {
              context.validMessage = true;
              context.slots.triage.spo2Walk = spo2;
            } else {
              context.validMessage = false;
            }
          }),
          always: [
            {
              cond: (context) => !context.validMessage,
              target: 'error'
            },
            {
              cond: (context) => context.slots.triage.spo2Walk > 95,
              actions: assign((context, event) => {
                context.slots.triage.conclusion = 'self-care'
              }),
              target: '#spaceAvailability'         // TODO: Replace with initial consult state name (triage details haven't been upserted. the details are present in context.slots.triage) 
            },
            {
              target: '#covidfyLinkPhysicalConsult'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    },
    subscribe: {
      id: 'subscribe'
    },
    spaceAvailability: {
      id: 'spaceAvailability',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            context.grammer = grammer.binaryChoice;
            dialog.sendMessage(context, dialog.get_message(messages.spaceAvailability.prompt, context.user.locale));
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event);
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              actions: assign((context, event) => {
                context.slots.triage.spaceAvailability = context.intention
              }),
              target: '#caregiverAvailability'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    },
    caregiverAvailability: {
      id: 'caregiverAvailability',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            context.grammer = grammer.binaryChoice;
            dialog.sendMessage(context, dialog.get_message(messages.caregiverAvailability.prompt, context.user.locale));
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event);
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              actions: assign((context, event) => {
                context.slots.triage.caregiverAvailability = context.intention
              }),
              target: '#aarogyaSetuDownloaded'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    },
    aarogyaSetuDownloaded: {
      id: 'aarogyaSetuDownloaded',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            console.log(context)
            context.grammer = grammer.binaryChoice;
            dialog.sendMessage(context, dialog.get_message(messages.aarogyaSetuDownloaded.prompt, context.user.locale));
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event);
            context.slots.triage.aarogyaSetuDownloaded = context.intention
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              cond: (context) => context.slots.triage.spaceAvailability == false || context.slots.triage.caregiverAvailability == false,
              actions: assign((context, event) => {
                context.slots.triage.conclusion = 'covidfyLinkBedAvailability'
              }),
              target: '#covidfyLinkBedAvailability'
            },
            {
              actions: assign((context, event) => {
                context.slots.triage.conclusion = 'pharmacologicalInterventions'
              }),
              target: '#pharmacologicalInterventions'         // TODO: Replace with initial consult state name (triage details haven't been upserted. the details are present in context.slots.triage) 
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.retry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    },
    pharmacologicalInterventions: {
      id: 'pharmacologicalInterventions',
      onEntry: assign((context, event) => {
        context.slots.triage.conclusion = 'NoCovid';
        dialog.sendMessage(context, dialog.get_message(messages.pharmacologicalInterventions, context.user.locale));
      }),
      always: '#infectionControl'
    },
    infectionControl: {
      id: 'infectionControl',
      onEntry: assign((context, event) => {
        context.slots.triage.conclusion = 'NoCovid';
        dialog.sendMessage(context, dialog.get_message(messages.infectionControl, context.user.locale));
      }),
      always: '#nonPharmacologicalInterventions'
    },
    nonPharmacologicalInterventions: {
      id: 'nonPharmacologicalInterventions',
      onEntry: assign((context, event) => {
        context.slots.triage.conclusion = 'NoCovid';
        dialog.sendMessage(context, dialog.get_message(messages.nonPharmacologicalInterventions, context.user.locale));
      }),
      always: '#upsertTriageDetails'
    },
    covidfyLinkPhysicalConsult: {
      id: 'covidfyLinkPhysicalConsult',
      onEntry: assign((context, event) => {
        context.slots.triage.conclusion = 'CovidfyLinkPhysicalConsult';
        dialog.sendMessage(context, dialog.get_message(messages.covidfyLinkPhysicalConsult, context.user.locale));
      }),
      always: '#upsertTriageDetails'
    },
    covidfyLinkBedAvailability: {
      id: 'covidfyLinkBedAvailability',
      onEntry: assign((context, event) => {
        context.slots.triage.conclusion = 'CovidfyLinkBedAvailability';
        dialog.sendMessage(context, dialog.get_message(messages.covidfyLinkBedAvailability, context.user.locale));
      }),
      always: '#upsertTriageDetails'
    },
    upsertTriageDetails: {
      id: 'upsertTriageDetails',
      invoke: {
        src: (context) => triageService.upsertTriageDetails(context.slots.triage.person, context.slots.triage),
        onDone: {
          target: '#endstate'
        }
      }
    }
  }
}

let messages = {
  personName: {
    prompt: {
      en_IN: 'Got it, please tell me your/patient’s name'
    },
    error: {
      en_IN: 'Please enter the name as text which is less than 100 characters.'
    }
  },
  personAge: {
    prompt: {
      en_IN: 'Thanks {{name}}. How old are you?'
    },
    error: {
      en_IN: 'Please enter the age as number in the range 0-120'
    }
  },
  personGender: {
    prompt: {
      en_IN: 'Please select gender of the patient'
    },
    options: {
      list: ['male', 'female', 'other'],
      messageBundle: {
        male: {
          en_IN: 'Male'
        },
        female: {
          en_IN: 'Female'
        },
        other: {
          en_IN: 'Other'
        }
      }
    }
  },
  symptoms: {
    prompt: {
      en_IN: 'Thanks for this information {{name}}! Do you have one or more of these complaints?: \n- Fever\n- Cough\n- Sore throat\n- Loss of smell\n- Loss of taste\n- Shortness of breath\n- Expectoration\n- Muscle pain\n- Runny nose\n- Nausea & diarrhoea\n'
    }
  },
  rtpcr: {
    prompt: {
      en_IN: 'What is your RT-PCR test result: \n1. Covid-19 Prositive\n2. Covid-19 Negative\n3. Haven\'t taken RT-PCR test'
    }
  },
  comorbidity: {
    prompt: {
      male: {
        en_IN: 'Do you have one or more of these conditions? \n- Diabetes\n- Hypertension\n- Chronic lung disease\n- Immunocompromised state\n- Ischemic heart disease\n- Obesity\n',
      },
      female: {
        en_IN: 'Do you have one or more of these conditions? \n- Diabetes\n- Hypertension\n- Chronic lung disease\n- Immunocompromised state\n- Ischemic heart disease\n- Obesity\n- Pregnancy\n'
      }
    }
  },
  endFlow: {
    ageConsultDoctorEnd: {
      en_IN: '{{name}}, your age poses an additional risk factor! It would be best, if you consulted a doctor right away so that you can undergo a few tests and start the right medication at the right time. To consult a doctor click <here>. \nFor more information regarding COVID-19 click <here>.'
    },
    symptomComorbidConsultDoctorEnd: {
      en_IN: '{{name}} your current symptoms along with your other medical condition(s) are making the situation risky. It would be best, if you consulted a doctor right away so that you can undergo a few tests and start the right medication.\n\nTo consult a doctor click <here>. For more information regarding COVID-19 click <here>'
    },
    testComorbidConsultDoctorEnd: {
      en_IN: '{{name}} your test result along with your other medical condition(s) are making the situation risky. \nIt would be best, if you  consulted a doctor right away so that you can undergo a few tests and start the right medication at the right time.\n\nTo consult a doctor click here. For more information regarding COVID-19 click <here>'
    },
    precautionEnd: {
      en_IN: '{{name}}, based on your responses,  your chances of getting COVID-19  is higher than that of the  average population. I suggest that you exercise caution and strictly follow these simple tips to stay healthy!\n1. Stay home  \n2. Wear an n95 mask \n3. Wash your hands with soap frequently\n4. Exercise indoors, meditate\n5. Sleep 7-8 hours hours a day and consume a balanced diet\n\nFor more information regarding COVID-19 click here'
    },
    noCovidEnd: {
      en_IN: '{{name}}, based on your responses, it is less likely that you are suffering from COVID-19 at this time. I suggest following these simple tips to stay healthy!\n1. Wear a triple layer medical mask appropriately (covering both mouth and nose and well fitted to the face)\n2. Take adequate rest 7-8 hrs a day and drink a lot of fluids to maintain adequate hydration.\n3. Eat a healthy low carbohydrate, high protein diet, with three meals per day,containing adequate vegetables and fruits.\n4. Avoid alcohol intake, quit smoking if the patient has any habits.\n5. Exercise, meditate or practise yoga.\n\nFor more information regarding COVID-19 click <here>'
    },
    lowSpo2End: {
      en_IN: '{{name}}, your current oxygen level is well  below the normal value. I suggest you consult a doctor right away! Besides medications, you may need some additional oxygen support. \n\nTo consult a doctor click here. For more information regarding COVID-19  click here'
    },
    noOximeterEnd: {
      en_IN: '{{name}}, checking your oxygen levels is one of the most important parameters to gauge the severity of your condition. My advice is please order a pulse oximeter right away from your local medical store. \nSend me a message when you have it so we can begin monitoring your vitals.'
    }
  },
  triageSpo2: {
    prompt: {
      preamble: {
        en_IN: 'I hope you have a pulse oximeter at home, Rahul. Check your SpO2. (For more information about a pulse oximeter and to learn how to use an oximeter click <here>)'
      },
      options: {
        list: [ 'above95', '90to94', 'below90', 'noOximeter' ],
        messageBundle: {
          above95: {
            en_IN: 'SpO2 is 95% or above'
          },
          '90to94': {
            en_IN: 'SpO2 is between 90 and  94%'
          }, 
          below90: {
            en_IN: 'SpO2 is below 90%'
          }, 
          noOximeter: {
            en_IN: 'Don’t have an oximeter'
          }
        }
      }
    }
  },
  normalSpo2: {
    en_IN: 'Your SpO2 is well within the normal range! This is a good sign! :) \nI suggest speaking to a doctor so that you can start a few medications to feel better. \nBesides that follow these 5  steps to rid this infection sooner!\n\n1. Take adequate rest 7-8 hrs a day and drink a lot of fluids to maintain adequate hydration.\n2. Eat a healthy low carbohydrate, high protein diet, with three meals per day,containing adequate vegetables and fruits.\n3. Avoid alcohol intake, quit smoking if the patient has any habits.\n4. Exercise, meditate or practise yoga\n5. Exercise your lungs by trying these breathing exercises\n\nClick <here> to know what more you can do to speed up your recovery'
  },
  triageSpo2Walk: {
    prompt: {
      en_IN: 'Could you please walk for 6 minutes and re-measure the oxygen level?'
    }
  },
  spaceAvailability: {
    prompt: {
      en_IN: 'Do you have a separate room and bathroom?\nPlease reply with Yes/No.'
    }
  },
  caregiverAvailability: {
    prompt: {
      en_IN: 'Do you have a caregiver available who is between 20-60 years of age?\nPlease reply with Yes/No.'
    }
  },
  aarogyaSetuDownloaded: {
    prompt: {
      en_IN: 'Have you downloaded the Aarogya Setu app?\nPlease reply with Yes/No.'
    }
  },
  nonPharmacologicalInterventions: {
    en_IN: 'Non Pharmacological Interventions Message'
  },
  pharmacologicalInterventions: {
    en_IN: 'Pharmacological Interventions Message'
  },
  infectionControl: {
    en_IN: 'Infection control home measures Message'
  },
  covidfyLinkPhysicalConsult: {
    en_IN: 'CovidfyLinkPhysicalConsult'
  },
  covidfyLinkBedAvailability: {
    en_IN: 'CovidfyLinkBedAvailability Message'
  }
}

let grammers = {
  binaryChoice: {
    prompt: '\n1. Yes\n2. No',
    grammer: [
      { intention: true, recognize: ['yes', 'y', '1'] },
      { intention: false, recognize: ['no', 'n', '2'] }
    ],
  },
  rtpcrTest: [
    { intention: 'positive', recognize: ['1'] },
    { intention: 'negative', recognize: ['2'] },
    { intention: 'na', recognize: ['3'] },
  ],

}

module.exports = triageFlow;
