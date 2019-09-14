// User service UUID: Change this to your generated service UUID
const USER_SERVICE_UUID         = '207D0223-3EEC-4b31-922d-786145b174e2';
// User service characteristics
const BTN_CHARACTERISTIC_UUID   = '62FBD229-6EDD-4D1A-B554-5C4E1BB29169';
const WRITE_CHARACTERISTIC_UUID   = 'E9062E71-9E62-4BC6-B0D3-35CDCD9B027B';

// PSDI Service UUID: Fixed value for Developer Trial
const PSDI_SERVICE_UUID         = 'E625601E-9E55-4597-A598-76018A0D293D';
const PSDI_CHARACTERISTIC_UUID  = '26E2B12B-85F0-4F3F-9FDD-91D114270E6E';

//action patern
const ARROW = 1;
const STOP = 2;
const ROTATE = 3;
const CATCH = 7;
const MOVE_LEFT_MP3 = "mp3/bgm_maoudamashii_8bit29.mp3";
const ARM_DOWN_MP3 = "mp3/se_maoudamashii_effect06.mp3";

// UI settings
let clickCount = 0;
let angleV = 0;
let angleS = 0;
let audioElem1 = new Audio();
let audioElem2 = new Audio();
let timerArrow = -1;
let timerRotate = -1;

// -------------- //
// On window load //
// -------------- //

window.onload = () => {
    audioElem1.src = MOVE_LEFT_MP3;
    audioElem1.load();
    audioElem2.src = ARM_DOWN_MP3;
    audioElem2.load();
    initializeApp();
};

// -------------- //
// On change lisner //
// -------------- //
document.addEventListener("DOMContentLoaded", function(){
  let el_arrow = document.getElementById('arrow');
  let el_rotate = document.getElementById('rotate');
  el_rotate.classList.add('disabled');

  el_arrow.addEventListener('touchstart', function(event) {
    console.log('touchstart');
    audioElem1.play();
    handlerToggle(ARROW);
    timerArrow = setTimeout(arrow_touch_end, 10000); //10sec
  }, false);

  el_arrow.addEventListener('touchend', function(event) {
    toggleBtnPrimary(el_arrow, el_rotate);
    arrow_touch_end();
  }, false);

  el_rotate.addEventListener('touchstart', function(event) {
    handlerToggle(ROTATE);
    timerArrow = setTimeout(rotate_touch_end, 10000); //10sec
  }, false);

  el_rotate.addEventListener('touchend', function(event) {
    toggleBtnPrimary(el_rotate);
    audioElem1.pause();
    timerRotate = setTimeout(rotate_touch_end, 5000); //5sec
  }, false);

  function toggleBtnPrimary(el1, el2 = null){
    el1.classList.add('disabled');
    el1.classList.remove('btn-primary');
    if(el2){
      el2.classList.remove('disabled');
      el2.classList.add('btn-primary');
    }
  }

  function arrow_touch_end(){
    clearTimeout(timerArrow);
    handlerToggle(STOP);
    el_rotate.classList.remove('disabled');
    el_stop.classList.add('disabled');
  }
  function rotate_touch_end(){
    clearTimeout(timerRotate);
    audioElem2.play();
    handlerToggle(CATCH);
    timer = setTimeout(restart, 30000); //30sec
  }
 
  function restart(){
    audioElem2.pause();
    toggleBtnPrimary(el_rotate, el_arrow);
  }
}, false);

// ----------------- //
// Handler functions //
// ----------------- //

function handlerToggle(i) {
    liffSentSerial(i);
}

// ------------ //
// UI functions //
// ------------ //

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
    console.log(errorObj);
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
            val = String.fromCharCode(val) + 0;
            if (val > 0 && val < 10) {
                // press
                alert("receive notification : " + val);
                //uiToggleStateButton(true);
            } else {
                // release
                //uiToggleStateButton(false);
                //uiCountPressButton();
            }
        });
    }).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}

function liffSentSerial(toggle) {
    let ch_array = [(new TextEncoder('ascii')).encode("0")];
    ch_array[0] = [(new TextEncoder('ascii')).encode(toggle)];
    window.outCharacteristic.writeValue(
        new Uint8Array(ch_array)
    ).catch(error => {
        uiStatusError(makeErrorMsg(error), false);
    });
}
