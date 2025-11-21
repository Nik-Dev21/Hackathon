const fetch = require('node-fetch');

async function checkBillStructure() {
    try {
        const response = await fetch('https://api.openparliament.ca/bills/?session=45-1&format=json&limit=1');
        const data = await response.json();
        console.log(JSON.stringify(data.objects[0], null, 2));
    } catch (error) {
        console.error(error);
    }
}

checkBillStructure();
