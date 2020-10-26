const { Machine, assign } = require('xstate');
const pgr = require('./pgr');
const bills = require('./bills');
const receipts = require('./receipts');

const sevaMachine = Machine({
    id: 'mseva',
    initial: 'start',
    on: {
      USER_RESET: {
        target: 'sevamenu',
        actions: (context, event) => context.chatInterface.toUser(context.user, "BIG RESET. Let us start over.") // TODO @Rushang This is getting printed too late
      }
    },
    states: {
        start: {
            on: {
              USER_MESSAGE: 'locale'
            }
          },
          locale: {
            id: 'locale',
            initial: 'question',
            states: {
              question: {
                onEntry: assign((context, event) => {
                  context.chatInterface.toUser(context.user, get_message(messages.locale.question));
                }),
                on: {
                  USER_MESSAGE: 'process'
                }
              },
              process: {
                onEntry: assign((context, event) => {
                  context.message = get_input(event);
                  // if (exact(grammer.locale.question.english, context.message)) {
                  //   context.user.locale = "en_IN"
                  // } else if (exact(grammer.locale.question.hindi, context.message)) {
                  //   context.user.locale = "hi_IN";
                  // } else {
                  //   context.chatInterface.toUser(context.user, 'Sorry, I didn\'t understand');
                  //   context.chatInterface.toUser(context.user, 'Proceeding in English');
                  //   context.user.locale = "en_IN"
                  // }
                  context.user.locale  = get_intention(grammer.locale.question, context.message, true);
                  if (context.user.locale === INTENTION_UNKOWN) {
                    context.chatInterface.toUser(context.user, 'Sorry, I didn\'t understand');
                    context.chatInterface.toUser(context.user, 'Proceeding in English');
                    context.user.locale = "en_IN"
                  }
                }),
                always: [{ target: '#welcome'}]
              }
            }
          },
          welcome: {
            id: 'welcome',
            onEntry: assign( (context, event, meta) => {
              let hello = get_message(messages.welcome.hello, context.user.locale)(context.user.name); 
              let welcome = get_message(messages.welcome.welcome, context.user.locale); 
              context.chatInterface.toUser(context.user, `${hello}. ${welcome}`);
            }),
            always: '#sevamenu'
          },
          sevamenu : { // rename to menu if you can figure out how to avoid name clash with seva's menu
            id: 'sevamenu',
            initial: 'question',
            states: {
              question: {
                onEntry: assign( (context, event) => {
                    let message = {
                    'en_IN' : 'Please type\n\n  1 for Complaints.\n  2 for Bills.\n  3 for Receipts',
                    'hi_IN': 'कृप्या टाइप करे\n\n  1 शिकायतों के लिए\n  2 बिलों के लिए\n  3 रसीदों के लिए'
                    };
                    context.chatInterface.toUser(context.user, message[context.user.locale]);
                }),
                on: {
                    USER_MESSAGE: [{
                      target: 'process'
                    }]
                }
              },
              process: {
                onEntry: assign((context, event) => {
                  context.message =  get_input(event);
                }),
                always : [
                  {
                    target: '#pgr',
                    // cond: (context, event) => contains(grammer.menu.question.pgr, context.message)
                    cond: (context, event) => get_intention(grammer.menu.question, context.message) == 'pgr'
                  },
                  {
                    target: '#bills', 
                    //cond: (context, event) => contains(grammer.menu.question.bills,context.message)
                    cond: (context, event) => get_intention(grammer.menu.question, context.message) == 'bills'
                  },
                  {
                    target: '#receipts', 
                    // cond: (context, event) => contains(grammer.menu.question.receipts,context.message) 
                    cond: (context, event) => get_intention(grammer.menu.question, context.message) == 'receipts'
                  },
                  {
                    target: 'error'
                  }
                ]
              }, // sevamenu.process
              error: {
                onEntry: assign( (context, event) => {
                  let message = 'Sorry, I didn\'t understand';
                  context.chatInterface.toUser(context.user, message);
                }),
                always : [
                  {
                    target: 'question'
                  }
                ]
              }, // sevamenu.error 
              pgr: pgr,
              bills: bills,
              receipts: receipts
        } // sevamenu.states
      } // sevamenu
    }, // states
}); // Machine

let messages = {
  error: {
    generic: {
      en_IN: 'I am sorry, I didn\'t understand. Let\'s try again.',
      hi_IN: 'मुझे क्षमा करें, मुझे समझ नहीं आया। फिर से कोशिश करें।'
    },
    proceeding: {
      en_IN: 'I am sorry, I didn\'t understand. Proceeding',
      hi_IN: 'मुझे क्षमा करें, मुझे समझ नहीं आया। फिर भी आगे बढ़ें।'
    }
  },
  locale : {
    question: {
      en_IN: "Please choose your preferred language\n 1.English 2. हिंदी",
      hi_IN: "कृपया अपनी पसंदीदा भाषा चुनें\n 1.English 2. हिंदी"
    }
  },
  welcome: {
    hello: {
      en_IN: (name)=>name? `Hello ${name}`: `Hello`,
      hi_IN: (name)=>name? `नमस्ते ${name}`: `नमस्ते`
    },
    welcome: {
      en_IN: 'Welcome to the State of Punjab\'s Seva Chatline.',
      hi_IN: 'पंजाब राज्य शिकायत चैट लाइन में आपका स्वागत है.',
    }
  }
}

let grammer = {
  locale: {
    question: [
      {intention: 'en_IN', recognize: ['1', 'english']},
      {intention: 'hi_IN', recognize: ['2', 'hindi']}
    ]
  },
  menu: {
    question: [
      {intention: 'pgr', recognize: ['1','complaint']}, 
      {intention: 'bills', recognize: ['2', 'bill']},
      {intention: 'receipts', recognize: ['3','receipt']}
    ]
  }
}
const INTENTION_UNKOWN = 'INTENTION_UKNOWN';
function get_input(event) {
  return event.message.input.trim().toLowerCase();
}
function get_message(bundle, locale = 'en_IN') {
  return (bundle[locale] === 'undefined')? bundle[en_IN] : bundle[locale];
}
function get_intention(g, utterance, strict = false) {
  // let utterance = get_input(event);
  //console.log(g);
  console.log(`looking for ${utterance} with strict set of ${strict}`);

  g.forEach(element => {
    console.log(element.recognize);
    //console.log(element.recognize.includes(utterance));
    console.log("---");
  });
  function exact(e) {return e.recognize.includes(utterance)}
  function contains(e) {return e.recognize.find(r=>utterance.includes(r))}
  //let index = strict? g.findIndex(e=>{e.recognize.includes(utterance)}) : g.findIndex(e=>{e.recognize.find(r=>utterance.includes(r))});
  let index = strict? g.findIndex(exact) : g.findIndex(e=>contains(e));

  console.log(`found ${index}`)
  return (index == -1) ? INTENTION_UNKOWN : g[index].intention;
}

// function contains(grammer, s) {
//   return grammer.find((element)=>s.includes(element))
// }
// function exact(grammer, s) {
//   return grammer.includes(s)
// }
module.exports = sevaMachine;
