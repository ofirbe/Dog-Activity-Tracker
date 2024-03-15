// Connect to MongoDB Atlas
const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://DogActivityTrackerMDBUser:yYLTjbqVYuOLcSDn@dogactivitytrackerclust.u0usm08.mongodb.net/";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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
function logActivity(activityType) {
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

    activityList.insertOne(newActivity, (err, result) => {
        if (err) {
            console.error("Error inserting activity into MongoDB:", err);
            return;
        }
        console.log("Activity logged successfully:", result.insertedId);
        displayActivities();
        calculateDailySummary();
        calculateWeeklySummary();
    });

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
    });
}

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
    const activityList = db.collection('activities');
    activityList.aggregate([
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                foodCount: { $sum: { $cond: { if: { $eq: ["$type", "food"] }, then: "$amount", else: 0 } } },
                walkCount: { $sum: { $cond: { if: { $eq: ["$type", "walk"] }, then: 1, else: 0 } } },
                peeCount: { $sum: { $cond: { if: { $eq: ["$type", "pee"] }, then: 1, else: 0 } } },
                poopCount: { $sum: { $cond: { if: { $eq: ["$type", "poop"] }, then: 1, else: 0 } } }
            }
        }
    ]).toArray((err, dailySummary) => {
        if (err) {
            console.error("Error calculating daily summary from MongoDB:", err);
            return;
        }
        var dailySummaryContainer = document.getElementById('daily-summary-content');
        dailySummaryContainer.innerHTML = ''; // Clear previous content

        dailySummary.forEach(function(summary) {
            var summaryContent = document.createElement('div');
            var foodColor = summary.foodCount === 600 ? 'green' : 'red';
            var walkColor = summary.walkCount < 3 ? 'red' : 'green';

            summaryContent.innerHTML = '<h3>' + summary._id + '</h3>' +
                'Food: <span style="color: ' + foodColor + '">' + summary.foodCount + 'g</span>, ' +
                'Walks: <span style="color: ' + walkColor + '">' + summary.walkCount + '</span>, ' +
                'Pees: ' + summary.peeCount + ', ' +
                'Poops: ' + summary.poopCount;
            dailySummaryContainer.appendChild(summaryContent);
        });

        document.getElementById('daily-summary-title').innerText = 'Daily Summary'; // Set daily summary title
    });
}

// Function to calculate weekly summary
function calculateWeeklySummary() {
    const activityList = db.collection('activities');
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    activityList.aggregate([
        {
            $match: { timestamp: { $gte: oneWeekAgo } }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                foodCount: { $sum: { $cond: { if: { $eq: ["$type", "food"] }, then: "$amount", else: 0 } } },
                walkCount: { $sum: { $cond: { if: { $eq: ["$type", "walk"] }, then: 1, else: 0 } } },
                peeCount: { $sum: { $cond: { if: { $eq: ["$type", "pee"] }, then: 1, else: 0 } } },
                poopCount: { $sum: { $cond: { if: { $eq: ["$type", "poop"] }, then: 1, else: 0 } } }
            }
        },
        {
            $sort: { _id: 1 } // Sort by date
        }
    ]).toArray((err, weeklySummary) => {
        if (err) {
            console.error("Error calculating weekly summary from MongoDB:", err);
            return;
        }
        var weeklySummaryTable = document.getElementById('weekly-summary-table');
        var weeklySummaryTBody = weeklySummaryTable.getElementsByTagName('tbody')[0];
        weeklySummaryTBody.innerHTML = ''; // Clear previous content

        weeklySummary.forEach(function(summary) {
            var row = document.createElement('tr');
            row.innerHTML = '<td>' + summary._id + '</td>' +
                '<td>' + summary.foodCount + '</td>' +
                '<td>' + summary.walkCount + '</td>' +
                '<td>' + summary.peeCount + '</td>' +
                '<td>' + summary.poopCount + '</td>';
            weeklySummaryTBody.appendChild(row);
        });

        document.getElementById('weekly-summary').style.display = 'block'; // Show the weekly summary
    });
}

// Hide the weekly summary initially
//document.getElementById('weekly-summary').style.display = 'none';

// Calculate and display daily summary when the page loads
window.addEventListener('load', function() {
    calculateDailySummary();
    calculateWeeklySummary();
    displayActivities();
});
