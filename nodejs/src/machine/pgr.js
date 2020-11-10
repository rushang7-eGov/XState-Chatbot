const { assign } = require('xstate');
const { pgrService } = require('./service/service-loader')
const dialog = require('./util/dialog');

const pgr =  {
  id: 'pgr',
  initial: 'menu',
  states: {
    menu : {
      id: 'menu',
      initial: 'question',
      states: {
        question: {
          onEntry: assign( (context, event) => {
              context.chatInterface.toUser(context.user, dialog.get_message(messages.menu.question, context.user.locale));
          }),
          on: {
              USER_MESSAGE:'process'
          }
        }, // menu.question
        process: {
          onEntry: assign((context, event) => context.intention = dialog.get_intention(grammer.menu.question, event)),
          always : [
            {
              target: '#fileComplaint',
              cond: (context) => context.intention == 'file_new_complaint'
            },
            {
              target: '#trackComplaint', 
              cond: (context) => context.intention == 'track_existing_complaints'
            },
            {
              target: 'error'
            }
          ]
        }, // menu.process
        error: {
          onEntry: assign( (context, event) => context.chatInterface.toUser(context.user, dialog.get_message(dialog.global_messages.error.retry, context.user.locale))),
          always : 'question'
        } // menu.error
      }, // menu.states
    }, // menu
    fileComplaint: {
      id: 'fileComplaint',
      initial: 'complaintType',
      states: {
        complaintType: {
          id: 'complaintType',
          initial: 'question',
          states: {
            question: {
              invoke: {
                src: (context) => pgrService.fetchFrequentComplaints(context.user.locale, 4),
                id: 'fetchFrequentComplaints',
                onDone: {
                  actions: assign((context, event) => {
                    let preamble = dialog.get_message(messages.fileComplaint.complaintType.question.preamble, context.user.locale);
                    let other = dialog.get_message(messages.fileComplaint.complaintType.question.other, context.user.locale);
                    let {prompt, grammer} = dialog.constructPromptAndGrammer(event.data.concat([other]));
                    context.grammer = grammer; // save the grammer in context to be used in next step
                    context.chatInterface.toUser(context.user, `${preamble}${prompt}`);
                  }) 
                },
                onError: {
                  actions: assign((context, event) => {
                    let message = dialog.get_message(dialog.global_messages.system_error, context.user.locale);
                    context.chatInterface.toUser(context.user, message);
                  })
                }
              },  // invoke
              on: {
                USER_MESSAGE: 'process'
              }
            }, //question
            process: {
              id: 'process',
              onEntry: assign((context, event) => {
                context.intention = dialog.get_intention(context.grammer, event) 
              }),
              always: [
                {
                  target: '#complaintType2Step',
                  cond: (context) => context.intention == 'Other ...' // TODO come back to fix this
                },
                {
                  target: '#geoLocationSharingInfo',
                  cond: (context) => context.intention != dialog.INTENTION_UNKOWN
                },
                {
                  target: 'error'
                }
              ]
            }, // process
            error: {
              onEntry: assign( (context, event) => {
                context.chatInterface.toUser(context.user, dialog.get_message(dialog.global_messages.error.retry, context.user.locale));
              }),
              always: 'question',
            } // error
          } // states of complaintType
        }, // complaintType
        complaintType2Step: {
          id: 'complaintType2Step',
          initial: 'complaintCategory',
          states: {
            complaintCategory: {
              id: 'complaintCategory',
              initial: 'question',
              states: {
                question: {
                  invoke:  {                  
                    src: (context, event)=>pgrService.fetchComplaintCategories(),
                    id: 'fetchComplaintCategories',
                    onDone: {
                      actions: assign((context, event) => {
                        let preamble = dialog.get_message(messages.fileComplaint.complaintType2Step.category.question.preamble, context.user.locale);
                        let startover = dialog.get_message(messages.fileComplaint.complaintType2Step.category.question.startover, context.user.locale);
                        let {prompt, grammer} = dialog.constructPromptAndGrammer(event.data.concat([startover]));
                        context.grammer = grammer; // save the grammer in context to be used in next step
                        context.chatInterface.toUser(context.user, `${preamble}${prompt}`);
                      }),
                    }, 
                    onError: {
                      actions: assign((context, event) => {
                        let message = dialog.get_message(dialog.global_messages.system_error, context.user.locale);
                        context.chatInterface.toUser(context.user, message);
                      })
                    }
                  }, // invoke
                  on: {
                    USER_MESSAGE: 'process'
                  }
                }, //question
                process: {
                  id: 'process',
                  onEntry: assign((context, event) => {
                    context.intention = dialog.get_intention(context.grammer, event) 
                  }),
                  always: [
                    {
                      target: '#complaintItem',
                      cond: (context) => context.intention != dialog.INTENTION_UNKOWN
                    },
                    {
                      target: 'error'
                    }
                  ]
                }, // process
                error: {
                  onEntry: assign( (context, event) => {
                    context.chatInterface.toUser(context.user, dialog.get_message(dialog.global_messages.error.retry, context.user.locale));
                  }),
                  always:  'question',
                } // error
              } // states of complaintCategory
            }, // complaintCategory
            complaintItem: {
              id: 'complaintItem',
              initial: 'question',
              states: {
                question: {
                  invoke:  {                  
                    src: (context) => pgrService.fetchComplaintItemsForCategory(context.intention),
                    id: 'fetchComplaintItemsForCategory',
                    onDone: {
                      actions: assign((context, event) => {
                        let preamble = dialog.get_message(messages.fileComplaint.complaintType2Step.item.question.preamble, context.user.locale);
                        let startover = dialog.get_message(messages.fileComplaint.complaintType2Step.category.question.startover, context.user.locale);
                        let {prompt, grammer} = dialog.constructPromptAndGrammer(event.data.concat([startover]));
                        context.grammer = grammer; // save the grammer in context to be used in next step
                        context.chatInterface.toUser(context.user, `${preamble}${prompt}`);
                      }),
                    }, 
                    onError: {
                      actions: assign((context, event) => {
                        let message = dialog.get_message(dialog.global_messages.system_error, context.user.locale);
                        context.chatInterface.toUser(context.user, message);
                      })
                    }
                  }, // invoke
                  on: {
                    USER_MESSAGE: 'process'
                  }
                }, //question
                process: {
                  id: 'process',
                  onEntry: assign((context, event) => {
                    context.intention = dialog.get_intention(context.grammer, event) 
                  }),
                  always: [
                    {
                      target: '#geoLocationSharingInfo',
                      cond: (context) => context.intention != dialog.INTENTION_UNKOWN
                    },
                    {
                      target: 'error'
                    }
                  ]
                }, // process
                error: {
                  onEntry: assign( (context, event) => {
                    context.chatInterface.toUser(context.user, dialog.get_message(dialog.global_messages.error.retry, context.user.locale));
                  }),
                  always:  'question',
                } // error
              } // states of complaintItem
            }, // complaintItem
          } // states of complaintType2Step
        }, // complaintType2Step
        geoLocationSharingInfo: {
          id: 'geoLocationSharingInfo',
          onEntry: assign( (context, event) => {
            context.chatInterface.toUser(context.user, '_Informational Image_');
          }),
          always: 'geoLocation'
        },
        geoLocation: {
          id: 'geoLocation',
          initial: 'question',
          states : {
            question: {
              onEntry: assign( (context, event) => {
                let message = dialog.get_message(messages.fileComplaint.geoLocation.question, context.user.locale)
                context.chatInterface.toUser(context.user, message);
              }),
              on: {
                USER_MESSAGE: 'process'
              }
            },
            process: {
              invoke: {
                id: 'getCityAndLocality',
                src: (context, event) => pgrService.getCityAndLocality(event),
                onDone: [
                  {
                    target: '#confirmLocation',
                    cond: (context, event) => event.data.city,
                    actions: assign((context, event) => {
                      console.log('asd');
                      context.pgr.slots.city = event.data.city;
                      context.pgr.slots.locality = event.data.locality;
                    })
                  },
                  {
                    target: '#city',
                    actions: assign((context, event) => {
                      console.log('qwe');
                    })
                  }
                ],
                onError: {
                  target: '#city',
                  actions: assign((context, event) => {
                    console.log('onError');
                  })
                }
              }
            }
          }
        },
        confirmLocation: {
          id: 'confirmLocation',
          initial: 'question',
          states: {
            question: {
              onEntry: assign((context, event) => {
                var message = 'Is this the correct location of the complaint?';
                message += '\nCity: ' + context.pgr.slots.city;
                if(context.pgr.slots.locality) {
                  message += '\nLocality: ' + context.pgr.slots.locality;
                }
                message += '\nPlease send \'No\', if it isn\'t correct'
                context.chatInterface.toUser(context.user, message);
              }),
              on: {
                USER_MESSAGE: 'process'
              }
            },
            process: {
              onEntry: assign((context, event) => {
                if(event.message.input.trim().toLowerCase() === 'no') {
                  context.pgr.confirmLocation = false;
                } else {
                  context.pgr.confirmLocation = true;
                }
              }),
              always: [
                {
                  target: '#persistComplaint',
                  cond: (context, event) => context.pgr.confirmLocation && context.pgr.slots.locality
                },
                {
                  target: '#locality',
                  cond: (context, event) => context.pgr.confirmLocation
                },
                {
                  target: '#city'
                }
              ]
            }
          }
        },
        city: {
          id: 'city',
          initial: 'question',
          states: {
            question: {
              invoke: {
                id: 'fetchCities',
                src: (context, event) => pgrService.fetchCities(),
                onDone: {
                  actions: assign((context, event) => {
                    var cityNames = event.data;
                    var message = 'Please select your city';
                    for(var i = 0; i < cityNames.length; i++) {
                      message += '\n' + (i+1) + '. ' + cityNames[i];
                    }
                    context.maxValidEntry = cityNames.length;
                    context.chatInterface.toUser(context.user, message);
                  })
                },
                onError: {
                  actions: assign((context, event) => {
                    let message = 'Sorry. Some error occurred on server';
                    context.chatInterface.toUser(context.user, message);
                  })
                }
              },
              on: {
                USER_MESSAGE: 'process'
              }
            },
            process: {
              onEntry:  assign((context, event) => {
                let parsed = parseInt(event.message.input.trim())
                // debugger
                let isValid = !isNaN(parsed) && parsed >=0 && parsed <= context.maxValidEntry;
                context.message = {
                  isValid: true,
                  messageContent: event.message.input.trim()
                }
                if(isValid) { // TODO This does not seem to be the right place for this. It's too early here
                  context.pgr.slots.city = parsed;
                }
              }),
              always : [
                {
                  target: 'error',
                  cond: (context, event) => {
                    return ! context.message.isValid;
                  }
                },
                {
                  target: '#locality'
                }
              ]
            },
            error: {
              onEntry: assign( (context, event) => {
                let message = 'Sorry, I didn\'t understand';
                context.chatInterface.toUser(context.user, message);
              }),
              always : 'question'
            }
          }
        },
        locality: {
          id: 'locality',
          initial: 'question',
          states: {
            question: {
              onEntry: assign( (context, event) => {
                let message = 'Please enter your locality'
                context.chatInterface.toUser(context.user, message);
              }),
              on: {
                USER_MESSAGE: [{target: 'process'}]
              }
            },
            process: {
              onEntry: assign((context, event) => {
                context.pgr.slots.locality = event.message.input;
              }),
              always: '#persistComplaint'
            }
          }
        },
        persistComplaint: {
          id: 'persistComplaint',
          always: '#endstate',
          onEntry: assign((context, event) => {
            console.log(context.pgr.slots);
            //make api call
            console.log('Making api call to PGR Service');
            let message = 'Complaint has been filed successfully {{number}}';
            let number = '123';
            message = message.replace('{{number}}', number);
            context.chatInterface.toUser(context.user, message);
            context.pgr = {};
          })
        },
      }, // fileComplaint.states
    },  // fileComplaint
    trackComplaint: {
      id: 'trackComplaint',
      always: '#endstate',
      onEntry: assign( (context, event) => {
        //make api call
        console.log('Making an api call to PGR Service');
        let message = 'Here are your recent complaints {{details}}';
        let details = 'No. - 123, ...';
        message = message.replace('{{details}}', details);
        context.chatInterface.toUser(context.user, message);
        context.pgr = {};
      })
    } // trackComplaint
  } // pgr.states
} // pgr

let messages = {
  menu: {
    question: {
      en_IN : 'Please type\n\n1 to File New Complaint.\n2 to Track Your Complaints',
      hi_IN: 'कृप्या टाइप करे\n\n1 यदि आप शिकायत दर्ज करना चाहते हैं\n2 यदि आप अपनी शिकायतों की स्थिति देखना चाहते हैं'
    }
  },
  fileComplaint: {
    complaintType: {
      question: {
        preamble: {
          en_IN : 'Please enter the number for your complaint',
          hi_IN : 'कृपया अपनी शिकायत के लिए नंबर दर्ज करें'
        },
        other: {
          en_IN : 'Other ...',
          hi_IN : 'कुछ अन्य ...'
        }
      }
    }, // complaintType
    complaintType2Step: {
      category: {
        question: {
          preamble: {
            en_IN : 'Please enter the number for your complaint category',
            hi_IN : 'अपनी शिकायत श्रेणी के लिए नंबर दर्ज करें'
          },
          startover: {
            en_IN : 'To start over',
            hi_IN : 'दुबारा प्रारम्भ करना'
          },
        }
      },
      item: {
        question: {
          preamble : {
            en_IN : 'Please enter the number for your complaint item',
            hi_IN : 'अपनी शिकायत के लिए नंबर दर्ज करें'
          },
          startover: {
            en_IN : 'To start over',
            hi_IN : 'दुबारा प्रारम्भ करना'
          },
        }
      },
    }, // complaintType2Step
    geoLocation: {
      question: {
        en_IN :'If you are at the grievance site, please share your location. Otherwise type any character.',
        hi_IN : 'यदि आप शिकायत स्थल पर हैं, तो कृपया अपना स्थान साझा करें। अगर नहीं किसी भी चरित्र को टाइप करें।'
      }
    } // geoLocation 
  }, // fileComplaint
}; // messages

let grammer = {
  menu: {
    question: [
      {intention: 'file_new_complaint', recognize: ['1', 'file', 'new']},
      {intention: 'track_existing_complaints', recognize: ['2', 'track', 'existing']}
    ]
  },
};
module.exports = pgr;
// -------------- Use this to create prompts for en_IN and hi_IN
// Categories
// StreetLights
// Garbage
// Drains
// WaterandSewage
// RoadsAndFootpaths
// Mosquitos
// Animals
// PublicToilets
// LandViolations
// Trees
// OpenDefecation
// Parks

// -------
//////Complaint Codes
// NoStreetlight
// StreetLightNotWorking
// GarbageNeedsTobeCleared
// DamagedGarbageBin
// BurningOfGarbage
// OverflowingOrBlockedDrain
// illegalDischargeOfSewage
// BlockOrOverflowingSewage
// ShortageOfWater
// NoWaterSupply
// DirtyWaterSupply
// BrokenWaterPipeOrLeakage
// WaterPressureisVeryLess
// DamagedRoad
// WaterLoggedRoad
// ManholeCoverMissingOrDamaged
// DamagedOrBlockedFootpath
// ConstructionMaterialLyingOntheRoad
// RequestSprayingOrFoggingOperation
// StrayAnimals
// DeadAnimals
// DirtyOrSmellyPublicToilets
// PublicToiletIsDamaged
// NoWaterOrElectricityinPublicToilet
// IllegalShopsOnFootPath
// IllegalConstructions
// IllegalParking
// IllegalCuttingOfTrees
// CuttingOrTrimmingOfTreeRequired
// OpenDefecation
// ParkRequiresMaintenance
// Others