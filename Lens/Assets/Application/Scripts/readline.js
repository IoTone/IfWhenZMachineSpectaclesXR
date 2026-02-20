// Create a global namespace if it doesn't exist
global.readline = global.readline || {};

global.readline.createReadline = function () {
    let pendingResolve = null;

    return {
        _pushInput: function (value) {
            if (pendingResolve) {
                pendingResolve(value);
                pendingResolve = null;
            }
        },

        question: function (prompt) {
            print(prompt);
            return new Promise(function (resolve) {
                pendingResolve = resolve;
            });
        }
    };
};
