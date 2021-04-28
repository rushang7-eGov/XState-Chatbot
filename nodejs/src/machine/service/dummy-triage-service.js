const pdfCreator = require('pdf-creator-node');

class TriageService {

    async upsertTriageDetails(person, triage) {
        // Nothing to return 
        console.log('Upsert Triage');
        console.log(JSON.stringify(triage));
    }

    getTriageDetails() {
        const triage = {
            isComorbid:false,
            person: {first_name: 'Manzur', age: 28, gender: 'male', uuid: '123'},
            age:28,
            first_name:'Manzur',
            gender:'male',
            uuid:'123',
            rtpcr:'positive',
            spo2:'above95',
            timestamp: new Date(),
            symptoms:false,
        }
        return triage;
    }

    async downloadReportForPerson(person) {
        //TODO: Move this template to a separate file
        const html = `<!DOCTYPE html>
            <html>
            <head>
                <mate charest="utf-8" />
                <title>{{this.person.first_name}}'s Report</title>
            </head>
            <body>
                <h1>Hi {{this.person.first_name}}, here's your report</h1>
                <div>
                Patient Details:
                <p>Symptoms: - {{this.triage.symptoms}}</p>
                <p>What is the result of rtPCR - {{this.triage.rtpcr}}</p>
                <p>Is having comorbid condition? - {{this.triage.isComorbid}}</p>
                </div>
                <div>
                Patient Readings:
                <p>Date of reading: {{this.triage.timestamp}}</>
                <p>SPO2 reading: {{this.triage.spo2}}</>
                <p>Temperature reading: {{this.triage.temperature}}</>
                </div>
            </body>
            </html>`

        const options = {
                format: "A3",
                orientation: "portrait",
                border: "10mm",
                header: {
                    height: "45mm",
                    contents: '<div style="text-align: center;">Swasth Chatbot</div>'
                },
                footer: {
                    height: "28mm",
                    contents: {
                        first: 'Cover page',
                        2: 'Second page', // Any page number is working. 1-based index
                        default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
                        last: 'Last Page'
                    }
                }
            };

        const variables = {
                person: {
                    first_name: person.first_name,
                    mobile: person.mobile
                },
                triage: this.getTriageDetails(),
                vitals: [
                ]
        };
              
        const document = {
                html: html,
                data: variables,
                path: `pdf-output/pdf-${person.uuid}-${new Date().getTime()}.pdf`,
                type: "",
              };
        
        pdfCreator.create(document, options)
                .then((res) => {
                        console.log(res);
                    })
                .catch((error) => {
                        console.error(error);
                    });
    }

    async exitProgram(person, exitSlots) {

    }

}

module.exports = new TriageService();