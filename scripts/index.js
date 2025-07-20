// console.log("Popup script loaded");

function getTabIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.has('tabId') ? parseInt(params.get('tabId'), 10) : null;
}

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
    // console.log("Token:", cleanToken);

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

    // console.log("headers:", headers);
    // console.log("body:", body);

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



document.addEventListener('DOMContentLoaded', () => {
    // Populate dropdown from hubs
    const hubDropdown = document.getElementById('hubDropdown');
    for (const hub in hubs) {
        const option = document.createElement('option');
        option.value = hub;
        option.textContent = hub;
        hubDropdown.appendChild(option);
    }
    const fetchBtn = document.getElementById('fetchBtn');
    const resultDiv = document.getElementById('resultDiv');

    fetchBtn.addEventListener('click', async () => {
        const doctorTableBody = document.querySelector('#doctorTable tbody');
        doctorTableBody.innerHTML = '';
        resultDiv.innerHTML = 'Loading...';
        const locationUids = hubs[hubDropdown.value];

        let all_doctors = [];
        for (const locationUid of locationUids) {
            try {
                const result = await executeInTab(tabId, get_status_info, [locationUid]);
                console.log("Result for locationUid", locationUid, result);
                const doctors = result.lstModel || [];
                all_doctors = all_doctors.concat(doctors);
                for (const doc of doctors) {
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-docid', doc.id);
                    tr.innerHTML = `<td><input type='checkbox' checked class='row-checkbox'></td><td>Dr. ${doc.firstName} ${doc.middleName} ${doc.lastName}</td><td>---</td>`;
                    doctorTableBody.appendChild(tr);
                }
            } catch (error) {
                resultDiv.innerHTML = `Error: ${error.message || error}`;
                break;
            }
        }
        if (all_doctors.length === 0) {
            resultDiv.innerHTML = 'No doctors found for the selected hub.';
            return;
        } else {
            resultDiv.innerHTML = '';
        }
        // Reset select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = true;
    });

    const startWatchingBtn = document.getElementById('startWatchingBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('#doctorTable tbody input.row-checkbox').forEach(cb => cb.checked = checked);
        });
    }

    // Keep selectAllCheckbox in sync with row checkboxes
    function syncSelectAllCheckbox() {
        const rowCheckboxes = document.querySelectorAll('#doctorTable tbody input.row-checkbox');
        const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = allChecked;
    }
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox')) {
            syncSelectAllCheckbox();
        }
    });

    startWatchingBtn.addEventListener('click', () => {
        // No action for now
    });
});


