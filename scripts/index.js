// console.log("Popup script loaded");

function getTabIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.has('tabId') ? parseInt(params.get('tabId'), 10) : null;
}

// function getTokenFromTab(tabId) {
//     const callback = token => globalToken = token;
//     executeInTab(tabId, function() {
//         try {
//             return localStorage.getItem('userToken');
//         } catch (e) {
//             return null;
//         }
//     }, function(err, token) {
//         callback && callback(token);
//     });
// }

function executeInTab(tabId, fn) {
    return new Promise((resolve, reject) => {
        if (!tabId) return reject(new Error('Tab ID not provided'));

        chrome.scripting.executeScript({
            target: { tabId },
            func: fn
        }, (results) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (!results || !results[0]) return resolve(undefined);
            resolve(results[0].result);
        });
    });
}





function get_status_info() {
  const token = localStorage.getItem('userToken');
  const cleanToken = token.replace(/^['"]+|['"]+$/g, '');

  if (!token) throw new Error('Token not found in localStorage');

  return fetch("https://prod-api01.swasthyaingit.in/prod/aus/api/v1/PractitionerStatus/GetStatusInfoBySpeciality", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cleanToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: "",
      locationUid: "2637487381803804",
      specialityCode: "0"
    })
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}



function check_doctor_status(uid = "0141432593019719") {
  const token = localStorage.getItem('userToken');
  const cleanToken = token.replace(/^['"]+|['"]+$/g, '');

  if (!token) throw new Error('Token not found in localStorage');

  const url = `https://prod-api02.swasthyaingit.in/prod/srs/api/v1/Connection/checkUserStatus/${uid}`;

  return fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${cleanToken}`,
      "Accept": "application/json, text/plain, */*",
    }
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });
}



const output = document.getElementById('output');
const tabId = getTabIdFromQuery();
// let globalToken = null;



document.addEventListener('DOMContentLoaded', () => {
    executeInTab(tabId, get_status_info)
        .then(result => {
            output.innerHTML += `Output is:<pre>${JSON.stringify(result, null, 2)}</pre>`;
        })
        .catch(error => {
            output.innerHTML += `Error: ${error.message || error}`;
        });

    executeInTab(tabId, check_doctor_status)
        .then(doctorStatus => {
            if (doctorStatus !== undefined) {
                output.innerHTML += `<br><br>Doctor Status:<pre>${doctorStatus}</pre>`;
            }
        })
        .catch(error => {
            output.innerHTML += `Error: ${error.message || error}`;
        });
});

