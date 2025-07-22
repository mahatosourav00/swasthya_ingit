// console.log("Popup script loaded");

const RELOAD_INTERVAL = 1000; // ms
const HISTORY_LENGTH = 5;
let all_doctors = {};
const fetchBtn = document.getElementById("fetchBtn");
const resultDiv = document.getElementById("resultDiv");

// Set CSS variable for reload interval
const root = document.documentElement;
root.style.setProperty("--reload-interval", RELOAD_INTERVAL + "ms");

function getTabIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.has("tabId") ? parseInt(params.get("tabId"), 10) : null;
}

function executeInTab(tabId, fn, args = []) {
    return new Promise((resolve, reject) => {
        if (!tabId) return reject(new Error("Tab ID not provided"));

        chrome.scripting.executeScript(
            {
                target: { tabId },
                func: fn,
                args: args,
            },
            (results) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                if (!results || !results[0]) return resolve(undefined);
                resolve(results[0].result);
            }
        );
    });
}

async function get_status_info(location) {
    const token = localStorage.getItem("userToken");
    const cleanToken = token.replace(/^['"]+|['"]+$/g, "");
    // console.log("Token:", cleanToken);

    if (!token) throw new Error("Token not found in localStorage");

    const headers = {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
    };

    const body = {
        status: "",
        locationUid: location,
        specialityCode: "0",
    };

    // console.log("headers:", headers);
    // console.log("body:", body);

    const r = await fetch(
        "https://prod-api01.swasthyaingit.in/prod/aus/api/v1/PractitionerStatus/GetStatusInfoBySpeciality",
        {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
        }
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
}

async function autoSelectDoctor(doc) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const fullName = `Dr. ${doc.firstName} ${doc.middleName ? doc.middleName + ' ' : ''}${doc.lastName}`.trim();
    console.log(`Attempting to select doctor: '${fullName}'`);

    document.querySelector('mat-select[formcontrolname="selectedDoctorid"]')?.click();
    await sleep(100);

    const options = document.querySelectorAll('mat-option');
    for (const opt of options) {
        console.log(`Checking option: '${opt.innerText}'`);
        if (opt.innerText.includes(fullName)) {
            opt.click();
            return true
        }
    }
    return false;
}

async function check_doctor_status(uid = "0141432593019719") {
    const token = localStorage.getItem("userToken");
    const cleanToken = token.replace(/^['"]+|['"]+$/g, "");

    if (!token) throw new Error("Token not found in localStorage");

    const url = `https://prod-api02.swasthyaingit.in/prod/srs/api/v1/Connection/checkUserStatus/${uid}`;

    const r = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: "application/json, text/plain, */*",
        },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
}

const output = document.getElementById("output");
const tabId = getTabIdFromQuery();
// let globalToken = null;

document.addEventListener("DOMContentLoaded", () => {
    // Populate dropdown from hubs
    const hubDropdown = document.getElementById("hubDropdown");
    for (const hub in hubs) {
        const option = document.createElement("option");
        option.value = hub;
        option.textContent = hub;
        hubDropdown.appendChild(option);
    }
    const showBusyActiveCheckbox = document.getElementById(
        "showBusyActiveCheckbox"
    );

    fetchBtn.addEventListener("click", async () => {
        startWatchingBtn.disabled = true;
        showBusyActiveCheckbox.disabled = true;
        const showBusyActive = showBusyActiveCheckbox.checked;
        const doctorTableBody = document.querySelector("#doctorTable tbody");
        doctorTableBody.innerHTML = "";
        all_doctors = {};
        resultDiv.innerHTML = "Loading...";
        const locationUids = hubs[hubDropdown.value];

        for (const locationUid of locationUids) {
            try {
                const result = await executeInTab(tabId, get_status_info, [
                    locationUid,
                ]);
                console.log("Result for locationUid", locationUid, result);
                const doctors = result.lstModel || [];
                for (const doc of doctors) {
                    const doc_stats = await executeInTab(tabId, check_doctor_status, [
                        doc.id,
                    ]);

                    const isBusyOrActive = doc_stats === "3" || doc_stats === "1";
                    if (!showBusyActive || isBusyOrActive) {
                        const tr = document.createElement("tr");
                        tr.setAttribute("data-docid", doc.id);
                        const checked = isBusyOrActive ? "checked" : "";
                        all_doctors[doc.id] = (doc);
                        tr.innerHTML = `<td><input type='checkbox' ${checked} class='row-checkbox'></td><td>Dr. ${doc.firstName
                            } ${doc.middleName} ${doc.lastName}</td><td>${status_dict[doc_stats] || doc_stats
                            }</td>`;
                        doctorTableBody.appendChild(tr);
                    }
                }
            } catch (error) {
                resultDiv.innerHTML = `Error: ${error.message || error}`;
                startWatchingBtn.disabled = false;
                showBusyActiveCheckbox.disabled = false;
                break;
            }
        }
        if (!Object.keys(all_doctors).length) {
            let a = "";
            if (showBusyActive) {
                a = " busy/active";
            }
            resultDiv.innerHTML = `No doctors found... Possible reasons:
            <ul>
                <li>No${a} doctors available in the hub '${hubDropdown.value}'.</li>
                <li>You might not be properly logged in or your session might have expired.</li>
            </ul>
            `;
            startWatchingBtn.disabled = false;
            showBusyActiveCheckbox.disabled = false;
            return;
        } else {
            console.log("All doctors fetched:", all_doctors);
            resultDiv.innerHTML = `Found ${Object.keys(all_doctors).length} doctors.`;
            // resultDiv.innerHTML = '';
        }
        // Reset select all checkbox
        const selectAllCheckbox = document.getElementById("selectAllCheckbox");
        if (selectAllCheckbox) selectAllCheckbox.checked = true;
        startWatchingBtn.disabled = false;
        showBusyActiveCheckbox.disabled = false;
    });

    const startWatchingBtn = document.getElementById("startWatchingBtn");
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", (e) => {
            const checked = e.target.checked;
            document
                .querySelectorAll("#doctorTable tbody input.row-checkbox")
                .forEach((cb) => (cb.checked = checked));
        });
    }

    // Keep selectAllCheckbox in sync with row checkboxes
    function syncSelectAllCheckbox() {
        const rowCheckboxes = document.querySelectorAll(
            "#doctorTable tbody input.row-checkbox"
        );
        const allChecked = Array.from(rowCheckboxes).every((cb) => cb.checked);
        const selectAllCheckbox = document.getElementById("selectAllCheckbox");
        if (selectAllCheckbox) selectAllCheckbox.checked = allChecked;
    }
    document.addEventListener("change", (e) => {
        if (e.target.classList.contains("row-checkbox")) {
            syncSelectAllCheckbox();
        }
    });

    let watchingIntervals = [];
    function stopAllWatching() {
        watchingIntervals.forEach((id) => clearInterval(id));
        watchingIntervals = [];
        startWatchingBtn.textContent = "Start Watching";
        startWatchingBtn.classList.remove("danger-bg");
        startWatchingBtn.classList.add("success-bg");
    }

    startWatchingBtn.addEventListener("click", () => {
        const doctorTableBody = document.querySelector("#doctorTable tbody");
        const rowCheckboxes =
            doctorTableBody.querySelectorAll("input.row-checkbox");
        if (watchingIntervals.length > 0) {
            // Stop watching mode
            // Re-enable checkboxes and fetch button
            rowCheckboxes.forEach((cb) => (cb.disabled = false));
            if (selectAllCheckbox) selectAllCheckbox.disabled = false;
            fetchBtn.disabled = false;
            stopAllWatching();
            return;
        }
        // Start watching mode
        // Disable checkboxes and fetch button
        rowCheckboxes.forEach((cb) => (cb.disabled = true));
        if (selectAllCheckbox) selectAllCheckbox.disabled = true;
        fetchBtn.disabled = true;
        startWatchingBtn.textContent = "Stop Watching";
        startWatchingBtn.classList.remove("success-bg");
        startWatchingBtn.classList.add("danger-bg");
        let doctorStatusHistory = {};
        const intervalId = setInterval(async () => {
            // setInterval

            const doctorTableBody = document.querySelector("#doctorTable tbody");
            const rows = doctorTableBody.querySelectorAll("tr");
            for (const row of rows) {
                const checkbox = row.querySelector("input.row-checkbox");
                if (checkbox && checkbox.checked) {
                    const docId = row.getAttribute("data-docid");
                    const doc = all_doctors[docId];
                    if (!doc) continue; // Skip if doctor not found
                    try {
                        const statusText = await executeInTab(tabId, check_doctor_status, [
                            docId,
                        ]);
                        console.log("check_doctor_status Response", statusText);
                        // Track last 5 statuses for each doctor
                        if (!doctorStatusHistory[docId]) doctorStatusHistory[docId] = [];
                        doctorStatusHistory[docId].push(statusText);
                        if (doctorStatusHistory[docId].length > HISTORY_LENGTH) doctorStatusHistory[docId].shift();
                        // Update status column (3rd td)
                        const statusTd = row.querySelectorAll("td")[2];
                        if (statusTd) {
                            statusTd.textContent = status_dict[statusText] || statusText;
                            statusTd.classList.remove("fade-status");
                            // Force reflow to restart animation
                            void statusTd.offsetWidth;
                            statusTd.classList.add("fade-status");
                        }
                        // Stop watching if last HISTORY_LENGTH statuses are all "Active" and autoCallCheckbox is checked
                        if (
                            doctorStatusHistory[docId].length === HISTORY_LENGTH &&
                            doctorStatusHistory[docId].every((s) => status_dict[s] === "Active") &&
                            document.getElementById("autoCallCheckbox").checked
                        ) {
                            stopAllWatching();
                            const fullName = `Dr. ${doc.firstName} ${doc.middleName ? doc.middleName + ' ' : ''}${doc.lastName}`.trim();
                            resultDiv.innerHTML = `Need to call ${fullName}. I will try to select the doctor now... `;

                            const select_successful = await executeInTab(tabId, autoSelectDoctor, [doc]);
                            if (select_successful) {
                                resultDiv.innerHTML += `Selected successfully.`;
                            } else {
                                resultDiv.innerHTML += `Failed to select. Please select manually. Possible reason maybe relevant hub and specialty not selected manually hence the doctor could not be found in the dropdown.`;
                            }

                            return;
                        }
                    } catch (err) {
                        const statusTd = row.querySelectorAll("td")[2];
                        if (statusTd) statusTd.textContent = `Error: ${err.message || err}`;
                        // Example: if error triggers stop
                        if (err && err.message === "STOP") {
                            stopAllWatching();
                            return;
                        }
                    }
                }
            }
        }, RELOAD_INTERVAL);
        watchingIntervals.push(intervalId);
    });

    document.getElementById("floatingReloadBtn").addEventListener("click", () => {
        location.reload();
    });
});
