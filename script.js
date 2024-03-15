const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://DogActivityTrackerMDBUser:yYLTjbqVYuOLcSDn@dogactivitytrackerclust.u0usm08.mongodb.net/?retryWrites=true&w=majority&appName=DogActivityTrackerCluster';
const client = new MongoClient(uri);

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectToDatabase();

// Function to log activity
async function logActivity(activityType) {
    const db = client.db('dogActivityDB');
    const collection = db.collection('dogActivityColl');

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

    const newActivity = {
        type: activityType,
        amount: activityType === 'food' ? amount : null,
        pee: activityType === 'walk' ? pee : null,
        poop: activityType === 'walk' ? poop : null,
        timestamp: new Date().toISOString()
    };
    
    if (activityType !== undefined ) {
        try {
            const result = await collection.insertOne(newActivity);
            console.log('Activity logged:', result.insertedId);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
    displayActivities();
    calculateDailySummary();
    calculateWeeklySummary();

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
function deleteActivity(index) {
    var activityList = JSON.parse(localStorage.getItem('activityList')) || [];
    activityList.splice(index, 1); // Remove activity at index
    localStorage.setItem('activityList', JSON.stringify(activityList));
    displayActivities();
    calculateDailySummary();
    calculateWeeklySummary();
}

// Function to clear all activities
function clearAll() {
    localStorage.removeItem('activityList');
    displayActivities();
    calculateDailySummary();
    calculateWeeklySummary();
}

// Function to display activities
function displayActivities() {
    var activityList = JSON.parse(localStorage.getItem('activityList')) || [];
    var activityListContainer = document.getElementById('activity-list');
    activityListContainer.innerHTML = '';
    activityList.reverse().forEach(function(activity, index) {
        var activityEntry = document.createElement('div');
        activityEntry.classList.add('activity-entry');
        activityEntry.textContent = 'Activity: ' + activity.type + (activity.amount ? ', Amount: ' + activity.amount + 'g' : '') + (activity.pee ? ', Pee' : '') + (activity.poop ? ', Poop' : '') + ', Time: ' + new Date(activity.timestamp).toLocaleString();

        // Add delete button
        var deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = function() {
            deleteActivity(index);
        };
        activityEntry.appendChild(deleteButton);

        activityListContainer.appendChild(activityEntry);
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
