// User service UUID: Change this to your generated service UUID
const USER_SERVICE_UUID         = '207D0223-3EEC-4b31-922d-786145b174e2';
// User service characteristics
const BTN_CHARACTERISTIC_UUID   = '62FBD229-6EDD-4D1A-B554-5C4E1BB29169';
const WRITE_CHARACTERISTIC_UUID   = 'E9062E71-9E62-4BC6-B0D3-35CDCD9B027B';

// PSDI Service UUID: Fixed value for Developer Trial
const PSDI_SERVICE_UUID         = 'E625601E-9E55-4597-A598-76018A0D293D';
const PSDI_CHARACTERISTIC_UUID  = '26E2B12B-85F0-4F3F-9FDD-91D114270E6E';

const ARROW = 1;
const ROTATE = 2;
const CATCH = 3;

// UI settings
let clickCount = 0;
let angleV = 0;
let angleS = 0;
let el_arrow = document.getElementById('arrow');
let el_hand = document.getElementById('hand');

// -------------- //
// On window load //
// -------------- //

window.onload = () => {
    initializeApp();
};

// -------------- //
// On change lisner //
// -------------- //
el_arrow.addEventListener('touchstart', function(event) {
  console.log('touchstart');
  handlerAllowToggle(1);
}, false);
el_arrow.addEventListener('touchend', function(event) {
  console.log('touchend');
  handlerAllowToggle(0);
}, false);
el_hand.addEventListener('touchend', function(event) {
  console.log('touchend');
  handlerCatch(1);
}, false);

// ----------------- //
// Handler functions //
// ----------------- //

function handlerArrowToggle(i) {
    liffSentSerial(i, ARROW);
}

function handlerRotate(i) {
    liffSentSerial(i, ROTATE);
}

function handlerCatch(i) {
    liffSentSerial(i, CATCH);
}


// ------------ //
// UI functions //
// ------------ //

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
        //document.getElementById("device-name").innerText = device.name;
        //document.getElementById("device-id").innerText = device.id;

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
        //document.getElementById("device-psdi").innerText = psdi;
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

function liffSentSerial(toggle, mode = ARROW) {
    // uint8_array[0]: ARROW
    // uint8_array[1]: CATCH
    // uint8_array[2]: ROTATE
    let ch_array = [(new TextEncoder('ascii')).encode("0")];
    if(mode == ARROW){
        ch_array[0] = [(new TextEncoder('ascii')).encode(toggle)];
        ch_array[1] = [(new TextEncoder('ascii')).encode("0")];
        ch_array[2] = [(new TextEncoder('ascii')).encode("0")];
    }else if(mode == CATCH){
        ch_array[0] = [(new TextEncoder('ascii')).encode("0")];
        ch_array[1] = [(new TextEncoder('ascii')).encode(toggle)];
        ch_array[2] = [(new TextEncoder('ascii')).encode("0")];
    }else{
        ch_array[0] = [(new TextEncoder('ascii')).encode("0")];
        ch_array[1] = [(new TextEncoder('ascii')).encode("0")];
        ch_array[2] = [(new TextEncoder('ascii')).encode(toggle)];
    }
    window.outCharacteristic.writeValue(
        new Uint8Array(ch_array)
    ).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

