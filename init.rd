Redmine::Plugin.register :redmine_chart_reporting do
  name 'Redmine Chart Reporting for issues'
  author 'Ákos Szabó'
  description 'Provides statistics on issue lists based on the selected fields'
  version '1.0.0'
  url 'https://github.com/WhitehawkTailor/redmine_chart_reporting'
  author_url 'https://github.com/WhitehawkTailor'
  requires_redmine version_or_higher: '5.0'
end

# This loads the Js code files to the page header.
class ChartReportingHookListener < Redmine::Hook::ViewListener
  def view_layouts_base_html_head(context)
    if context[:controller] && 
       context[:controller].controller_name == 'issues' && 
       context[:controller].action_name == 'index'
      
      # Gets the chart.js and the report logic code from the assets and places it under the Redmine place.
      tags = []
      tags << javascript_include_tag('chart.umd.min.js', :plugin => 'redmine_chart_reporting')
      tags << javascript_include_tag('reporting_logic.js', :plugin => 'redmine_chart_reporting')
      return tags.join("\n").html_safe
    end
  end
end
