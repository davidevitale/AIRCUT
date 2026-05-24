let barberProfileContext = {
  returnTo: null,
};

export const setBarberProfileContext = ({ returnTo = null } = {}) => {
  barberProfileContext = {
    returnTo,
  };
};

export const getBarberProfileContext = () => barberProfileContext;

