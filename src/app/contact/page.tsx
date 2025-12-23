"use client";

import { useState } from "react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    console.log("문의 제출 시작:", formData);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("문의 제출 성공");
        setSubmitStatus("success");
        setShowSuccessModal(true);
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        console.error("문의 제출 실패:", data.error);
        setSubmitStatus("error");
        setErrorMessage(data.error || "문의 전송 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("문의 제출 오류:", error);
      setSubmitStatus("error");
      setErrorMessage("문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 성공 모달 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2 text-foreground">
              문의가 전송되었습니다!
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              문의가 성공적으로 전송되었습니다.
              <br />
              빠른 시일 내에 답변드리겠습니다.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-800">
          <h1 className="text-3xl font-bold mb-2 text-foreground">문의하기</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            마케팅 도구의 오류나 문제점, 추가하고 싶은 기능이 있다면 언제든지
            문의해주세요.
          </p>

          {submitStatus === "success" && !showSuccessModal && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200">
                문의가 성공적으로 전송되었습니다. 빠른 시일 내에
                답변드리겠습니다.
              </p>
            </div>
          )}

          {submitStatus === "error" && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium mb-2 text-foreground"
              >
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-foreground"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2 text-foreground"
              >
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-foreground"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium mb-2 text-foreground"
              >
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-foreground"
                placeholder="문의 제목을 입력해주세요"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium mb-2 text-foreground"
              >
                문의 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={8}
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-foreground resize-none"
                placeholder="문의 내용을 자세히 입력해주세요..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isSubmitting ? "전송 중..." : "문의 보내기"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
