import { useState } from "react";
import { register, RegisterAccount } from "../api/account";

export function Register() {
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<RegisterAccount>({
        email: '',
        password: '',
        confirm_password: '',
        username: ''
    });

    const handleSubmit =  async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (form.password !== form.confirm_password) {
            alert('Passwords do not match');
            return;
        }

        try {
            setLoading(true);

            const res = await register(form);

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Registration failed');
                setLoading(false);
                return;
            }

            alert('Registration successful');
            window.location.href = '/';
        } catch (err) {
            console.error(err);
            alert('Network error');
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    return(
        <div className="flex flex-col items-center justify-center py-10"> 
            <div className="w-full max-w-md"> 
                <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Register</h1>
                <p className="text-gray-500 mt-2">Please enter your credentials to register</p>
              </div>
              <div>
                <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
                    <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Insert your email here"
                    />
                    </div>

                    <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                    </label>
                    <input
                        type="username"
                        id="username"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Insert your username here"
                    />
                    </div>

                    <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Insert your password here"
                    />
                    </div>

                    <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                    </label>
                    <input
                        type="password"
                        id="confirm-password"
                        name="confirm_password"
                        value={form.confirm_password}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Insert your password here"
                    />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium"
                        >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
              </div>
              </div>
            </div>
    )
}