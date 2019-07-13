// User service UUID: Change this to your generated service UUID
const USER_SERVICE_UUID         = '3530F755-2C14-4866-8380-DB853E7209F8';
// User service characteristics
const BTN_CHARACTERISTIC_UUID   = '62FBD229-6EDD-4D1A-B554-5C4E1BB29169';
const WRITE_CHARACTERISTIC_UUID   = 'E9062E71-9E62-4BC6-B0D3-35CDCD9B027B';

// PSDI Service UUID: Fixed value for Developer Trial
const PSDI_SERVICE_UUID         = 'E625601E-9E55-4597-A598-76018A0D293D';
const PSDI_CHARACTERISTIC_UUID  = '26E2B12B-85F0-4F3F-9FDD-91D114270E6E';

const VERTICAL = 1;
const SIDE = 2;

// UI settings
let clickCount = 0;
let angleV = 0;
let angleS = 0;

// -------------- //
// On window load //
// -------------- //

window.onload = () => {
    initializeApp();
};

// -------------- //
// On change lisner //
// -------------- //


// ----------------- //
// Handler functions //
// ----------------- //

function handlerGetImage(v) {
    liffGetImageDevice(v);
}

function handlerServo01(i) {
    angleV = angleV += i;
    if(angleV <= 1 && angleV >= 9){
      return false;
    }

    liffChangeDeviceServo(angleV, VERTICAL);
}

function handlerServo02(i) {
    angleS = angleS += i;
    if(angleS <= 1 && angleS >= 9){
      return false;
    }
    liffChangeDeviceServo(angleS, SIDE);
}


// ------------ //
// UI functions //
// ------------ //

/*
function uiToggleLedButton(state) {
    const el = document.getElementById("btn-led-toggle");
    el.innerText = state ? "Switch LED OFF" : "Switch LED ON";

    if (state) {
      el.classList.add("led-on");
    } else {
      el.classList.remove("led-on");
    }
}
*/

function uiCountPressButton() {
    clickCount++;

    const el = document.getElementById("click-count");
    //el.innerText = clickCount;
    el.innerText = servo01.value;
}

function uiToggleStateButton(pressed) {
    const el = document.getElementById("btn-state");

    if (pressed) {
        el.classList.add("pressed");
        el.innerText = "Pressed";
    } else {
        el.classList.remove("pressed");
        el.innerText = "Released";
    }
}

function uiToggleDeviceConnected(connected) {
    const elStatus = document.getElementById("status");
    const elControls = document.getElementById("controls");

    elStatus.classList.remove("error");

    if (connected) {
        // Hide loading animation
        uiToggleLoadingAnimation(false);
        // Show status connected
        elStatus.classList.remove("inactive");
        elStatus.classList.add("success");
        elStatus.innerText = "Device connected";
        // Show controls
        elControls.classList.remove("hidden");
    } else {
        // Show loading animation
        uiToggleLoadingAnimation(true);
        // Show status disconnected
        elStatus.classList.remove("success");
        elStatus.classList.add("inactive");
        elStatus.innerText = "Device disconnected";
        // Hide controls
        elControls.classList.add("hidden");
    }
}

function uiToggleLoadingAnimation(isLoading) {
    const elLoading = document.getElementById("loading-animation");

    if (isLoading) {
        // Show loading animation
        elLoading.classList.remove("hidden");
    } else {
        // Hide loading animation
        elLoading.classList.add("hidden");
    }
}

function uiStatusError(message, showLoadingAnimation) {
    uiToggleLoadingAnimation(showLoadingAnimation);

    const elStatus = document.getElementById("status");
    const elControls = document.getElementById("controls");

    // Show status error
    elStatus.classList.remove("success");
    elStatus.classList.remove("inactive");
    elStatus.classList.add("error");
    elStatus.innerText = message;

    // Hide controls
    elControls.classList.add("hidden");
}

function makeErrorMsg(errorObj) {
    return "Error\n" + errorObj.code + "\n" + errorObj.message;
}

// -------------- //
// LIFF functions //
// -------------- //

function initializeApp() {
    liff.init(() => initializeLiff(), error => uiStatusError(makeErrorMsg(error), false));
}

function initializeLiff() {
    liff.initPlugins(['bluetooth']).then(() => {
        liffCheckAvailablityAndDo(() => liffRequestDevice());
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffCheckAvailablityAndDo(callbackIfAvailable) {
    // Check Bluetooth availability
    liff.bluetooth.getAvailability().then(isAvailable => {
        if (isAvailable) {
            uiToggleDeviceConnected(false);
            callbackIfAvailable();
        } else {
            uiStatusError("Bluetooth not available", true);
            setTimeout(() => liffCheckAvailablityAndDo(callbackIfAvailable), 10000);
        }
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });;
}

function liffRequestDevice() {
    liff.bluetooth.requestDevice().then(device => {
        liffConnectToDevice(device);
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffConnectToDevice(device) {
    device.gatt.connect().then(() => {
        document.getElementById("device-name").innerText = device.name;
        document.getElementById("device-id").innerText = device.id;

        // Show status connected
        uiToggleDeviceConnected(true);

        // Get service
        device.gatt.getPrimaryService(USER_SERVICE_UUID).then(service => {
            liffGetUserService(service);
        }).catch(error => {
            uiStatusError(makeErrorMsg(error), false);
        });
        device.gatt.getPrimaryService(PSDI_SERVICE_UUID).then(service => {
            liffGetPSDIService(service);
        }).catch(error => {
            uiStatusError(makeErrorMsg(error), false);
        });

        // Device disconnect callback
        const disconnectCallback = () => {
            // Show status disconnected
            uiToggleDeviceConnected(false);

            // Remove disconnect callback
            device.removeEventListener('gattserverdisconnected', disconnectCallback);

            // Reset UI elements
            uiToggleStateButton(false);

            // Try to reconnect
            initializeLiff();
        };

        device.addEventListener('gattserverdisconnected', disconnectCallback);
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetUserService(service) {
    // Button pressed state
    service.getCharacteristic(BTN_CHARACTERISTIC_UUID).then(characteristic => {
        liffGetButtonStateCharacteristic(characteristic);
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });

    // OUTPUT_VALUE
    service.getCharacteristic(WRITE_CHARACTERISTIC_UUID).then(characteristic => {
        window.outCharacteristic = characteristic;
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetPSDIService(service) {
    // Get PSDI value
    service.getCharacteristic(PSDI_CHARACTERISTIC_UUID).then(characteristic => {
        return characteristic.readValue();
    }).then(value => {
        // Byte array to hex string
        const psdi = new Uint8Array(value.buffer)
            .reduce((output, byte) => output + ("0" + byte.toString(16)).slice(-2), "");
        document.getElementById("device-psdi").innerText = psdi;
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetButtonStateCharacteristic(characteristic) {
    // Add notification hook for button state
    // (Get notified when button state changes)
    characteristic.startNotifications().then(() => {
        characteristic.addEventListener('characteristicvaluechanged', e => {
            const val = (new Uint8Array(e.target.value.buffer))[0];
            if (val > 0) {
                // press
                uiToggleStateButton(true);
            } else {
                // release
                uiToggleStateButton(false);
                uiCountPressButton();
            }
        });
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffGetImageDevice(v) {
    // uint8_array[0]: camera shutter flag
    // uint8_array[1]: servo1 angle (angle is 0 = false)
    // uint8_array[2]: servo2 angle (angle is 0 = false)
    let text = "100";
    let ch_array = text.split("");
    for(let i = 0; i < 3; i = i + 1){
      ch_array[i] = (new TextEncoder('ascii')).encode(ch_array[i]);
    }
    window.outCharacteristic.writeValue(
        new Uint8Array(ch_array)
    ).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffChangeDeviceServo(angle, way = VERTICAL) {
    // uint8_array[0]: camera shutter flag
    // uint8_array[1]: servo1 angle (angle is 0 = false)
    // uint8_array[2]: servo2 angle (angle is 0 = false)
    let ch_array = [(new TextEncoder('ascii')).encode("0")];
    if(way == VERTICAL){
        ch_array[1] = [(new TextEncoder('ascii')).encode(angle)];
        ch_array[2] = [(new TextEncoder('ascii')).encode("0")];
    }else{
        ch_array[1] = [(new TextEncoder('ascii')).encode("0")];
        ch_array[2] = [(new TextEncoder('ascii')).encode(angle)];
    }
    window.outCharacteristic.writeValue(
        new Uint8Array(ch_array)
    ).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
    const el = document.getElementById("anglev");
    el.innerText = angleV;
}

