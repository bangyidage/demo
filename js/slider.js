function animate(element, target) {
    var step = 10;
    var time = 10;
    var gap = (Math.abs(target - element.offsetLeft) / slider_item_width);
    if (gap > 1) {
        step = step * gap;
        time = time / gap;
    }
    if (element) {
        step = (element.offsetLeft > target) ? -step : step;
        clearInterval(intervalId);
        setCurrentActiveIndicator(curIndex);
        intervalId = setInterval(function () {
            if (Math.abs(element.offsetLeft + step) < Math.abs(target)) {
                element.style.left = element.offsetLeft + step + "px";
            } else {
                if (Math.abs(target - element.offsetLeft) > Math.abs(step)) {
                    element.style.left = element.offsetLeft + step + "px";
                } else {
                    clearInterval(intervalId);
                    intervalId = -1;
                    element.style.left = target + "px";
                    // 移动到目标位置，继续自动播放
                    if (autoplay) {
                        startAnimation(element);
                    }
                }
            }
        }, time);
    }
}
function prev() {
    var element = slider_item_container;
    var li = element.children;
    curIndex = curIndex - 1;
    if (curIndex < 0) {
        element.style.left = -((li.length-1)*slider_item_width) + "px";
        curIndex = li.length-2;
    }
    animate(element, -(curIndex*slider_item_width));
}

function next(nextIndex) {
    var element = slider_item_container;
    var li = element.children;
    if ((nextIndex != null) && (typeof(nextIndex) != "undefined")) {
        curIndex = nextIndex;
    } else {
        curIndex = curIndex + 1;
        if (curIndex > (li.length-1)) {
            element.style.left = 0 + "px";
            curIndex = 1;
        }
    }
    animate(element, -(curIndex*slider_item_width));
}

function startAnimation(element) {
    if (autoplayId) {
        clearTimeout(autoplayId);
    }
    autoplayId = setTimeout(function () {
        next();
    }, autoplay_Delay);
}
animate()