import { useState, useEffect } from 'react';
import { getCourses } from '../../../api/services/course';
import { getActivities } from '../../../api/services/activity';
import { getSubtasks } from '../../../api/services/subtack';
import { getReprogrammingLogs } from '../../../api/services/reprogrammingLog';

export const useTodayData = () => {
  const [courses, setCourses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [coursesData, activitiesData, subtasksData, logsData] = await Promise.all([
          getCourses(),
          getActivities(),
          getSubtasks(),
          getReprogrammingLogs(),
        ]);

        setCourses(coursesData);
        setActivities(activitiesData);
        setSubtasks(subtasksData);
        setLogs(logsData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { courses, activities, subtasks, logs, loading, error };
};
