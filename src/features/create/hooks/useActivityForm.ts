import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses } from '@/api/services/course';
import type { ActivityFormData, SubtaskFormData, Course, ActivityType } from '../types';

export const useActivityForm = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    courseId: '',
    type: 'Tarea',
    deliveryDate: '',
    eventDate: '',
    description: '',
    subtasks: [],
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const updateField = <K extends keyof ActivityFormData>(
    field: K,
    value: ActivityFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addSubtask = () => {
    const newSubtask: SubtaskFormData = {
      id: `subtask-${Date.now()}`,
      name: '',
      targetDate: '',
      estimatedHours: 0,
    };
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSubtask],
    }));
  };

  const removeSubtask = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== id),
    }));
  };

  const updateSubtask = (id: string, field: keyof SubtaskFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) =>
        st.id === id ? { ...st, [field]: value } : st
      ),
    }));
  };

  const handleCancel = () => {
    navigate('/hoy');
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Por favor, ingresa un título para la actividad');
      return;
    }

    if (!formData.courseId) {
      alert('Por favor, selecciona un curso');
      return;
    }

    if (!formData.deliveryDate) {
      alert('Por favor, ingresa una fecha de entrega');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Implementar llamada a API para crear actividad y subtareas
      console.log('Form data:', formData);
      navigate('/hoy');
    } catch (error) {
      console.error('Error creating activity:', error);
      alert('Error al crear la actividad. Por favor, intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    courses,
    loading,
    submitting,
    updateField,
    addSubtask,
    removeSubtask,
    updateSubtask,
    handleCancel,
    handleSubmit,
  };
};
