const text = document.getElementById("time");
setInterval(function() {
    const d = new Date();
    let timezoneOffset = 0
    if (ShellSite) {
        timezoneOffset = d.getTimezoneOffset() + 2*60; //2 hours ahead GMT
    } else {
        timezoneOffset = d.getTimezoneOffset() - 7*60; //7 hours behind GMT
    }
    var timezone = '12'
    let minutes = (d.getHours() + Math.floor(timezoneOffset / 60))*60 + d.getMinutes() + (timezoneOffset % 60)
    
    if (`${(minutes / 60 ^ 0)%12}` != '0') {timezone = (minutes / 60 ^ 0)%12} // Print Hour
    if (timezone < 0){
        timezone = timezone + 12
    }
    if (d.getSeconds()%2 == 0 ) {timezone = timezone + ":"} else {timezone = timezone + "."} // Make Divider Blink
    timezone = timezone + ("0" + (minutes % 60)).slice(-2); // Print Minutes
    if ((minutes / 60 ^ 0)%24 < 11) {timezone = timezone + " AM"} else {timezone = timezone + " PM"} // Append AM/PM based on hour
    
    // Update Text
    text.textContent = timezone;
}, 1000);