# Redmine charts - v1.0.0 [![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/donate/?business=AAG2P7YL5VEKU&no_recurring=0&currency_code=EUR&item_name=GitHub-Redmine-Charts)

This is a plugin for [Redmine](http://www.redmine.org/).

It is a simple chart reporting plugin for Redmine to visualize the statistics of an issue list by displaying a donnut chart based on any selected field of the issue list.

![redmine_chart_reporting_02](https://github.com/user-attachments/assets/c5df10c8-8937-41a0-be10-6bc7eae46cd7)

This plugin is powered by:
* [chart.js](https://www.chartjs.org)

## Compatibility
This plugin was tested with `5.0.8` version of Redmine.

It is highly possible that this runs also with any 5.x and 6.x versions.
In case you checked the compatibility with any Redmine version, please let me know the result.

## Warnings

> [!IMPORTANT]
> The plugin uses API calls, so API must be activated in Redmine (see Administration/Settings/API).
> In some case, when the issue list is out of any project the browser may require further authentication.
> In this case the user must have an API access key, which will be generated automatically when user opens his "My account" page.
> When the script realises missing API access key, then redirects the user to the "My Accont" page.

## Features
* Displays a donut chart on the issues list based on the selected fields.
* It can handle custom fields too and displays the human readable value of these fields.
* The script uses API calls to fetch extra data for the chart.
* The chart area is collapsible. In this case the code does not fetch data.
* It remembers for the "collapse", "show values" and "Group by" settings.
 
## Usage
* The plugin automatically appears on issue pages just after the filters.
* It is possible to close/open the chart arrea with the > sign before the "Charts" title. It works just like the "Filters" title above.
* You can change the column parameter (Group by) for the chart. 
* The apperance of data above the figure can be switched on/off. Hints above any piece of the figure show the related data of the area.
* Change the filter settings and using actions the chart will be recalculated.
* Change the selected columns under the options and the new column will appear in the "Group by" list of the chart.


## Install
```
$ cd redmine/plugins
$ git clone https://github.com/WhitehawkTailor/redmine_chart_reporting.git
$ rake redmine:plugins:migrate NAME=redmine_indicator
```
In case Redmine operates in a container ( podman, or docker) then run this (redmine is the name of the container):
```
$ podman exec -it redmine bundle exec rake redmine:plugins:assets RAILS_ENV=production
```
restart Redmine

## Uninstall
```
$ cd redmine/plugins
$ rake redmine:plugins:migrate NAME=redmine_indicator VERSION=0
```
In case Redmine operates in a container ( podman, or docker) then run this (redmine is the name of the container):
```
$ podman exec -it redmine bundle exec rake redmine:plugins:migrate NAME=redmine_indicator VERSION=0
```
restart Redmine

## Dependencies
The plugin includes chart.umd.min.js from [https://www.chartjs.org](https://www.chartjs.org).
It is a one file version of chart.js that embeds all the functions and assets that is required to draw a chart.
You can replace it to a newer version, but compatibility is not granted.
Find the chart file here: `redmine/plugins/redmine_chart_reporting/assets/javascripts/`


## Localization
The plugin initially supports two languages (English, Hungarian). The language is selected based on the parent page language settings in HTML. It is the language that the user uses in Redmine.

Localization can be extended, just add your language to the localization dictionary in the `reporting_logic.js` file.

The location of the file: `redmine/plugins/redmine_chart_reporting/assets/javascripts/`
```javascript
const l10n = {
        hu: {
            chart_title: "Kimutatások (API alapú)",
            loading: "Adatok lekérése az API-n keresztül...",
            auth: "Hitelesítés folyamatban...",
            grouping: "Csoportosítás:",
            show_values: "Értékek mutatása",
            auth_error: "A kimutatásokhoz API kulcs szükséges. Kérlek, generáld le a 'Saját fiókom' oldalon a 'Megjelenítés' linkre kattintva!",
            api_error: "Hiba az adatok lekérésekor (Status: ",
            no_data: "Nincs megjeleníthető adat (0/0)",
            total_tasks: "feladat",
            distribution: "szerinti megoszlás",
            db: "db"
        },
        en: {
            chart_title: "Charts (API based)",
            loading: "Fetching data via API...",
            auth: "Authenticating...",
            grouping: "Group by:",
            show_values: "Show values",
            auth_error: "API key required. Please generate it on 'My account' page by clicking 'Show'!",
            api_error: "Error fetching data (Status: ",
            no_data: "No data to display (0/0)",
            total_tasks: "tasks",
            distribution: "distribution",
            db: "pcs"
        }
    };
```

## Further development
Planned new features:
* selectable chart types
* configurable panels for Home, My Page and project summary pages.
* Standalon My Report page with multiple panels.

## Author

Ákos Szabó
