const generateOTP = async () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handleOtp = async () => {
  await generateOTP();
};
