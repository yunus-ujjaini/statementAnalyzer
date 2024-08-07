function getMonthNameFromDate(dateString, format) {
  const dateFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD/MM/YY', 'MM/DD/YY', 'YYYY/MM/DD', 'YYYY-DD-MM'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Parse the date string into a Date object
  let myDate;
  if (format === 'YYYY-MM-DD') {
    myDate = new Date(dateString);
  } else if (format === 'MM/DD/YYYY' || format === 'MM/DD/YY') {
    const [month, day, year] = dateString.split('/');
    myDate = new Date(year.length === 2 ? `20${year}` : year, month - 1, day);
  } else if (format === 'DD/MM/YYYY' || format === 'DD/MM/YY') {
    const [day, month, year] = dateString.split('/');
    myDate = new Date(year.length === 2 ? `20${year}` : year, month - 1, day);
  } else if (format === 'YYYY/MM/DD') {
    const [year, month, day] = dateString.split('/');
    myDate = new Date(year, month - 1, day);
  } else if (format === 'YYYY-DD-MM') {
    const [year, day, month] = dateString.split('-');
    myDate = new Date(year, month - 1, day);
  } else {
    throw new Error('Unsupported date format');
  }

  // Return the month name
  return monthNames[myDate.getMonth()];
}

function getInsightsByMonth(data) {
  const insights = {
    totalIncome: 0,
    totalSpend: 0,
    vendorDetails: [
    ]
  };

  // Group items with similar description which starts with similar description
  const vendorMap = {};
  //eg: UPI-PRAVINBHAI RAMLAL NA-PAYTMQRFYFPT9U2FN@PAYTM-PYTM0123456-406271281168-UPI or UPI-NARAYAN-PAYTMQR2810050501011LPRXJR0QEO6@PAYTM-PYTM0123456-406273219543-UPI
  const upiRegex = /^(UPI)-([A-Z\s]+)/;
  //eg: POS 416021XXXXXX5404 SHREE VARAHI PET or POS 416021XXXXXX5404 RELIANCE SMART
  const posRegex = /^(POS) ([\d]+X+[\d]+) ([A-Z\s]+)/;
  //eg: ME DC SI 416021XXXXXX5404 NETFLIX or ME DC SI 416021XXXXXX5404 IND*MICROSOFT
  const meRegex = /^(ME DC SI) (\d+X+\d+) ([A-Z]+(\*[A-Z]+)*)/
  //eg: NEFT CR-KKBK0000958-PROCLINK CONSULTING SERVICES LLP-YUNUS MOIZBHAI UJJAINI-CMS0902411872332
  const neftRegex = /^(NEFT) ([A-Z]+)-([A-Z]+\d+)-([A-Z\s]+)/
  //eg: IMPS-407512131928-SETU-UTIB-XXXXXXXXXXX3007-IMPSREDEMPTIONREQUEST or IMPS-412208356690-YUNUS MOIZ UJJAINI-BKID-XXXXXXXXXXX1429-SENDING TO ANOTHER ACCOUNT
  const impsRegex = /^(IMPS)-(\d+)-([A-Z\s]+)/
  //eg: CREDIT INTEREST CAPITALISED
  const creditInterestRegex = /^(CREDIT INTEREST CAPITALISED)/;
  //eg: EMI 461400316 CHQ S4614003160051 0624461400316
  const emiRegex = /^(EMI \d+)/

  data.forEach(item => {
    let vendorName='';
    if (upiRegex.test(item.Description)) {
      const match = item.Description.match(upiRegex);
      vendorName = match[2];
    } else if (posRegex.test(item.Description)) {
      const match = item.Description.match(posRegex);
      vendorName = match[3];
    } else if (meRegex.test(item.Description)) {
      const match = item.Description.match(meRegex);
      vendorName = match[3];
    } else if (neftRegex.test(item.Description)) {
      const match = item.Description.match(neftRegex);
      vendorName = match[4];
    } else if (impsRegex.test(item.Description)) {
      const match = item.Description.match(impsRegex);
      vendorName = match[3];
    } else if (creditInterestRegex.test(item.Description)) {
      vendorName = 'CREDIT INTEREST CAPITALISED';
    } else if (emiRegex.test(item.Description)) {
      const match = item.Description.match(emiRegex);
      vendorName = match[1];
    } else {
      vendorName = item.Description;
    }
    if (!vendorMap[vendorName]) {
      vendorMap[vendorName] = [];
    }
    vendorMap[vendorName].push(item);
  });

  console.log("vendorMap",vendorMap);

  // Add vendor details in insight object
  Object.keys(vendorMap).forEach(vendorName => {
    const vendorDetails = {
      vendorName: vendorName,
      vendorIncome: 0,
      vendorSpend: 0
    };
    vendorMap[vendorName].forEach(item => {
      // item has debit and credit amount
      if (item.Debit != "") {
        vendorDetails.vendorSpend += Math.floor(parseFloat(item.Debit));
        insights.totalSpend += Math.floor(parseFloat(item.Debit));
      } else if (item.Credit) {
        vendorDetails.vendorIncome += Math.floor(parseFloat(item.Credit));
        insights.totalIncome += Math.floor(parseFloat(item.Credit));
      }
    });
    insights.vendorDetails.push(vendorDetails);
  });

  return insights;

}


function showMonthRecords(month) {
  const AllVendorRecords = document.querySelectorAll(`.vendor-records`);
  const vendorRecords = document.querySelectorAll(`.vendor-${month}`);

  // Check if the first vendor record for the month is currently displayed
  const isDisplayed = vendorRecords.length > 0 && vendorRecords[0].style.display === 'flex';

  // Hide all vendor records
  AllVendorRecords.forEach(record => {
    record.style.display = "none";
  });

  // Show or hide the vendor records for the selected month based on the current state
  vendorRecords.forEach(record => {
    record.style.display = isDisplayed ? 'none' : 'flex';
  });
};

document.getElementById('uploadForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    formData.append('file', fileInput.files[0]);

    fetch('/upload', {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(error => { throw new Error(error.message); });
      }
      return response.json();
    })
    .then(data => {
      const messageDiv = document.getElementById('err-message');
      const dataDiv = document.getElementById('data');
      if (data.success) {


        //Add one more column in data map to store the month name
        data.data.forEach(item => {
          item.Month = getMonthNameFromDate(item.Date, data.dateFormat);
        });
        console.log(data);

        // Divide the map based to month name into different arrays
        const dataByMonth = {};
        data.data.forEach(item => {
          if (!dataByMonth[item.Month]) {
            dataByMonth[item.Month] = [];
          }
          dataByMonth[item.Month].push(item);
        });

        console.log(dataByMonth);

        // Calculate the insights for each month
        const insights = {};
        Object.keys(dataByMonth).forEach(month => {
          insights[month] = getInsightsByMonth(dataByMonth[month]);
        });

        let recordsData = '';
        Object.keys(insights).forEach(month => {
          const insight = insights[month];

          recordsData += `<div class="record"> <div class="month-record" id="month-record" data-month="${month}" onClick="showMonthRecords('${month}')">
            <div class="month">${month}</div>
            <div class="month-data">
              <div class="totalIncome">Total Income: ${insight.totalIncome}</div>
              <div class="totalSpend">Total Spend: ${insight.totalSpend}</div>
            </div>
          </div>`

          //sort vendorDetails based on totalIncome and totalSpend
          insight.vendorDetails.sort((a, b) => {
            return b.vendorIncome + b.vendorSpend - (a.vendorIncome + a.vendorSpend);
          });
          insight.vendorDetails.forEach(vendor => {
            recordsData += `<div class="vendor-record vendor-${month}">
              <div class="vendor">${vendor.vendorName}</div>
              <div class="vendor-data">
              <div class="vendorTotalIncome">Total Income: ${vendor.vendorIncome}</div>
              <div class="vendorTotalSpend">Total Spend: ${vendor.vendorSpend}</div>
              </div>
            </div>`;
          });
        });

        // console.log("insights", insights);

        dataDiv.innerHTML = recordsData;
      } else {
        messageDiv.textContent = data.message;
        messageDiv.style.color = 'red';
      }

    })
      .catch(error => {
      const messageDiv = document.getElementById('err-message');
      messageDiv.textContent = 'An error occurred: ' + error.message;
      messageDiv.style.color = 'red';
    });
});
