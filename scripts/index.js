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



function executeInTab(tabId, fn, args = []) {
    return new Promise((resolve, reject) => {
        if (!tabId) return reject(new Error('Tab ID not provided'));

        chrome.scripting.executeScript({
            target: { tabId },
            func: fn,
            args: args
        }, (results) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (!results || !results[0]) return resolve(undefined);
            resolve(results[0].result);
        });
    });
}






function get_status_info(location) {
    const token = localStorage.getItem('userToken');
    const cleanToken = token.replace(/^['"]+|['"]+$/g, '');

    if (!token) throw new Error('Token not found in localStorage');

    const headers = {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json"
    };

    const body = {
        status: "",
        locationUid: location,
        specialityCode: "0"
    };

    console.log("headers:", headers);
    console.log("body:", body);

    return fetch("https://prod-api01.swasthyaingit.in/prod/aus/api/v1/PractitionerStatus/GetStatusInfoBySpeciality", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
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



// document.addEventListener('DOMContentLoaded', async () => {
//     try {
//         const result = await executeInTab(tabId, get_status_info);
//         output.innerHTML += `Output is:<pre>${JSON.stringify(result, null, 2)}</pre>`;
//     } catch (error) {
//         output.innerHTML += `Error: ${error.message || error}`;
//     }
//
//     try {
//         const doctorStatus = await executeInTab(tabId, check_doctor_status);
//         if (doctorStatus !== undefined) {
//             output.innerHTML += `<br><br>Doctor Status:<pre>${doctorStatus}</pre>`;
//         }
//     } catch (error) {
//         output.innerHTML += `Error: ${error.message || error}`;
//     }
// });

// Add hub dropdown and fetch button feature


document.addEventListener('DOMContentLoaded', () => {
    // Populate dropdown from hubs
    const hubDropdown = document.getElementById('hubDropdown');
    for (const hub in hubs) {
        const option = document.createElement('option');
        option.value = hubs[hub];
        option.textContent = hub;
        hubDropdown.appendChild(option);
    }
    const fetchBtn = document.getElementById('fetchBtn');
    const resultDiv = document.getElementById('resultDiv');

    fetchBtn.addEventListener('click', async () => {
        const doctorTableBody = document.querySelector('#doctorTable tbody');
        doctorTableBody.innerHTML = '';
        resultDiv.innerHTML = 'Loading...';
        const locationUid = hubDropdown.value;
        try {
            const result = await executeInTab(tabId, get_status_info, [locationUid]);
            const doctors = result.lstModel || [];
            console.log("Doctors:", doctors);
            for (const doc of doctors) {
                const tr = document.createElement('tr');
                tr.setAttribute('data-docid', doc.id);
                tr.innerHTML = `<td><input type='checkbox' checked></td><td>Dr. ${doc.firstName} ${doc.lastName}</td><td>---</td>`;
                doctorTableBody.appendChild(tr);
            }
            resultDiv.innerHTML = '';
        } catch (error) {
            resultDiv.innerHTML = `Error: ${error.message || error}`;
        }
    });

    const selectAllBtn = document.getElementById('selectAllBtn');
    const selectNoneBtn = document.getElementById('selectNoneBtn');
    const startWatchingBtn = document.getElementById('startWatchingBtn');

    selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('#doctorTable tbody input[type="checkbox"]').forEach(cb => cb.checked = true);
    });
    selectNoneBtn.addEventListener('click', () => {
        document.querySelectorAll('#doctorTable tbody input[type="checkbox"]').forEach(cb => cb.checked = false);
    });
    startWatchingBtn.addEventListener('click', () => {
        // No action for now
    });
});


