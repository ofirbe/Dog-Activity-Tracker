// Connect to MongoDB Atlas
const mongoClient = require("mongodb").MongoClient;
const uri = "mongodb+srv://DogActivityTrackerMDBUser:yYLTjbqVYuOLcSDn@dogactivitytrackerclust.u0usm08.mongodb.net/";
const client = new mongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to the MongoDB database
let db;
client.connect((err) => {
    if (err) {
        console.error("Error connecting to MongoDB Atlas:", err);
        return;
    }
    console.log("Connected to MongoDB Atlas");
    db = client.db("DogActivityTrackerCluster");
});

// Function to log activity
function logActivity(activityType, callback) {
    if (!db) {
        console.error("MongoDB connection not established");
        return;
    }

    var amountInput = document.getElementById('food-amount');
    var peeCheckbox = document.getElementById('pee');
    var poopCheckbox = document.getElementById('poop');

    var amount = amountInput.value;
    var pee = peeCheckbox.checked;
    var poop = poopCheckbox.checked;

    if (activityType === 'food') {
        if (amount === '' || isNaN(amount) || amount < 1 || amount > 1000) {
            alert('Please enter a valid amount for food (between 1 and 1000 grams).');
            return;
        }
        amount = parseInt(amount);
    }

    const activityList = db.collection('activities');
    var newActivity = {
        type: activityType,
        amount: activityType === 'food' ? amount : null,
        pee: activityType === 'walk' ? pee : null,
        poop: activityType === 'walk' ? poop : null,
        timestamp: new Date().toISOString()
    };
    if (activityType !== undefined ) {
        activityList.insertOne(newActivity, (err, result) => {
            if (err) {
                console.error("Error inserting activity into MongoDB:", err);
                return;
            }
            console.log("Activity logged successfully:", result.insertedId);
            if (typeof callback === 'function') {
                callback(); // Execute the callback function
            }
        });
    }

    // Clear input fields after logging the activity and hide the respective form
    amountInput.value = '';
    peeCheckbox.checked = false;
    poopCheckbox.checked = false;

    if (activityType === 'food') {
        document.getElementById('food-form').style.display = 'none';
    } else if (activityType === 'walk') {
        document.getElementById('walk-form').style.display = 'none';
    }
}

// Function to display food form
function showFoodForm() {
    document.getElementById('food-form').style.display = 'block';
    document.getElementById('walk-form').style.display = 'none';
}

// Function to display walk form
function showWalkForm() {
    document.getElementById('food-form').style.display = 'none';
    document.getElementById('walk-form').style.display = 'block';
}

// Function to delete activity
function deleteActivity(id) {
    const activityList = db.collection('activities');
    activityList.deleteOne({ _id: id }, (err, result) => {
        if (err) {
            console.error("Error deleting activity from MongoDB:", err);
            return;
        }
        console.log("Activity deleted successfully:", id);
        displayActivities();
        calculateDailySummary();
        calculateWeeklySummary();
    });
}
// Function to clear all activities
function clearAll() {
    const activityList = db.collection('activities');
    activityList.deleteMany({}, (err, result) => {
        if (err) {
            console.error("Error clearing activities from MongoDB:", err);
            return;
        }
        console.log("All activities cleared successfully");
        displayActivities();
        calculateDailySummary();
        calculateWeeklySummary();
    });}

// Function to display activities
function displayActivities() {
    const activityList = db.collection('activities');
    activityList.find().toArray((err, activities) => {
        if (err) {
            console.error("Error fetching activities from MongoDB:", err);
            return;
        }
        var activityListContainer = document.getElementById('activity-list');
        activityListContainer.innerHTML = '';
        activities.reverse().forEach(function(activity) {
            var activityEntry = document.createElement('div');
            activityEntry.classList.add('activity-entry');
            activityEntry.textContent = 'Activity: ' + activity.type + (activity.amount ? ', Amount: ' + activity.amount + 'g' : '') + (activity.pee ? ', Pee' : '') + (activity.poop ? ', Poop' : '') + ', Time: ' + new Date(activity.timestamp).toLocaleString();

            // Add delete button
            var deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = function() {
                deleteActivity(activity._id);
            };
            activityEntry.appendChild(deleteButton);

            activityListContainer.appendChild(activityEntry);
        });
    });
}

// Function to calculate daily summary
function calculateDailySummary() {
    var dailySummaryContainer = document.getElementById('daily-summary-content');
    dailySummaryContainer.innerHTML = ''; // Clear previous content

    var activityList = JSON.parse(localStorage.getItem('activityList')) || {};
    var dailySummary = {};

    // Group activities by date
    Object.keys(activityList).forEach(function(timestamp) {
        var activity = activityList[timestamp];
        var activityDate = new Date(activity.timestamp).toDateString();
        if (!dailySummary[activityDate]) {
            dailySummary[activityDate] = {
                foodCount: 0,
                walkCount: 0,
                peeCount: 0,
                poopCount: 0
            };
        }
        switch (activity.type) {
            case 'food':
                dailySummary[activityDate].foodCount += activity.amount || 0;
                break;
            case 'walk':
                dailySummary[activityDate].walkCount++;
                if (activity.pee) dailySummary[activityDate].peeCount++;
                if (activity.poop) dailySummary[activityDate].poopCount++;
                break;
            case 'pee':
                dailySummary[activityDate].peeCount++;
                break;
            case 'poop':
                dailySummary[activityDate].poopCount++;
                break;
        }
    });

// Create summary content for each day
    Object.keys(dailySummary).forEach(function(dateString) {
        var summaryContent = document.createElement('div');
        var foodCount = dailySummary[dateString].foodCount;
        var foodColor = foodCount === 600 ? 'green' : 'red';
        var walkCount = dailySummary[dateString].walkCount;
        var walkColor = walkCount < 3 ? 'red' : 'green';

        summaryContent.innerHTML = '<h3>' + dateString + '</h3>' +
            'Food: <span style="color: ' + foodColor + '">' + foodCount + 'g</span>, ' +
            'Walks: <span style="color: ' + walkColor + '">' + walkCount + '</span>, ' +
            'Pees: ' + dailySummary[dateString].peeCount + ', ' +
            'Poops: ' + dailySummary[dateString].poopCount;
        dailySummaryContainer.appendChild(summaryContent);
    });

    document.getElementById('daily-summary-title').innerText = 'Daily Summary'; // Set daily summary title
}

// Function to calculate weekly summary
function calculateWeeklySummary() {
    var weeklySummaryContainer = document.getElementById('weekly-summary');
    var weeklySummaryTable = document.getElementById('weekly-summary-table');
    var weeklySummaryTBody = weeklySummaryTable.getElementsByTagName('tbody')[0];
    weeklySummaryTBody.innerHTML = ''; // Clear previous content

    var activityList = JSON.parse(localStorage.getItem('activityList')) || [];
    var weeklySummary = {};

    // Initialize weekly summary for each day
    for (var i = 0; i < 7; i++) {
        var date = new Date();
        date.setDate(date.getDate() - i);
        weeklySummary[date.toDateString()] = {
            foodCount: 0,
            walkCount: 0,
            peeCount: 0,
            poopCount: 0
        };
    }

    // Update weekly summary based on activity list
    activityList.forEach(function(activity) {
        var activityDate = new Date(activity.timestamp).toDateString();
        switch (activity.type) {
            case 'food':
                weeklySummary[activityDate].foodCount += activity.amount || 0;
                break;
            case 'walk':
                weeklySummary[activityDate].walkCount++;
                if (activity.pee) weeklySummary[activityDate].peeCount++;
                if (activity.poop) weeklySummary[activityDate].poopCount++;
                break;
            case 'pee':
                weeklySummary[activityDate].peeCount++;
                break;
            case 'poop':
                weeklySummary[activityDate].poopCount++;
                break;
        }
    });

    // Create table rows for each day in the week
    Object.keys(weeklySummary).forEach(function(dateString) {
        var row = document.createElement('tr');
        row.innerHTML = '<td>' + dateString + '</td>' +
            '<td>' + weeklySummary[dateString].foodCount + '</td>' +
            '<td>' + weeklySummary[dateString].walkCount + '</td>' +
            '<td>' + weeklySummary[dateString].peeCount + '</td>' +
            '<td>' + weeklySummary[dateString].poopCount + '</td>';
        weeklySummaryTBody.appendChild(row);
    });

    weeklySummaryContainer.style.display = 'block'; // Show the weekly summary
}

// Hide the weekly summary initially
//document.getElementById('weekly-summary').style.display = 'none';

// Calculate and display daily summary when the page loads
window.addEventListener('load', function() {
    calculateDailySummary();
    calculateWeeklySummary();
    logActivity();
});
