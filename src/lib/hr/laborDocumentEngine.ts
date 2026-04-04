export interface FiniquitoInput {
  startDate: Date; endDate: Date;
  annualSalary: number;
  vacationDaysEntitled: number; vacationDaysTaken: number;
  extraPayments: number;
  dismissalType: 'procedente' | 'improcedente' | 'temporal_end' | 'null';
  yearsWorked: number;
}

export function calculateFiniquito(input: FiniquitoInput) {
  const dailySalary = input.annualSalary / 365;
  const monthSalary = input.annualSalary / 12;
  const vacationPending = Math.max(0, input.vacationDaysEntitled - input.vacationDaysTaken);
  const vacationAmount = Math.round(dailySalary * vacationPending * 100) / 100;
  const currentMonth = input.endDate.getMonth() + 1;
  const extraProportional = input.extraPayments > 12 ? Math.round((monthSalary / (input.extraPayments - 12)) * (currentMonth / 6) * 100) / 100 : 0;
  const indemnizationDays = input.dismissalType === 'improcedente' ? 33 : input.dismissalType === 'procedente' ? 20 : input.dismissalType === 'temporal_end' ? 12 : 0;
  const maxMonths = input.dismissalType === 'improcedente' ? 24 : 12;
  const severance = Math.min(Math.round(dailySalary * indemnizationDays * input.yearsWorked * 100) / 100, monthSalary * maxMonths);
  return {
    vacationAmount, vacationPending, extraProportional, severance, indemnizationDays,
    total: Math.round((vacationAmount + extraProportional + severance) * 100) / 100,
    legalNote: `ET Art. ${input.dismissalType === 'improcedente' ? '56' : input.dismissalType === 'procedente' ? '53' : '49'}`,
  };
}
